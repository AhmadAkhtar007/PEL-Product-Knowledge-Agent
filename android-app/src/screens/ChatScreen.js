import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Image, Alert, KeyboardAvoidingView, Platform,
  Animated, Modal, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { Feather as Lucide } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../theme/ThemeContext';

import ChatBubble from '../components/ChatBubble';
import InputCapsule from '../components/InputCapsule';
import EmptyStateOrb from '../components/EmptyStateOrb';

const { width: SCREEN_WIDTH } = require('react-native').Dimensions.get('window');

const getBackendUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8000`;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
};
const BACKEND_URL = getBackendUrl();

export default function ChatScreen({ onNavigateSettings }) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isStartingRecording = useRef(false);
  const shouldStopImmediately = useRef(false);

  // Database lists
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // Streaming Chat & Input States
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [selectedModel, setSelectedModel] = useState('Glass Door Prism Series');

  // Voice States
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // Modal Viewers
  const [zoomedImage, setZoomedImage] = useState(null);

  // Animation values
  const drawerTranslateX = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Scroll ref
  const scrollViewRef = useRef();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/conversations`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.log('Error fetching conversations:', error);
    }
  };

  const deleteConversation = (id) => {
    Alert.alert('Delete Chat', 'Are you sure you want to delete this conversation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${BACKEND_URL}/conversations/${id}`, { method: 'DELETE' });
            if (res.ok) {
              if (activeConversation?.id === id) {
                setActiveConversation(null);
                setMessages([]);
                Speech.stop();
                setPlayingMessageId(null);
              }
              fetchConversations();
            } else {
              Alert.alert('Error', 'Failed to delete conversation.');
            }
          } catch (e) {
            Alert.alert('Error', 'Network error while deleting.');
          }
        }
      }
    ]);
  };

  // Drawer Toggle
  const toggleDrawer = (open) => {
    setDrawerOpen(open);
    Animated.timing(drawerTranslateX, {
      toValue: open ? 0 : -SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Open full-screen chat
  const openChatOverlay = async (conv = null) => {
    if (conv) {
      setActiveConversation(conv);
      setSelectedModel('Glass Door Prism Series');
      try {
        const res = await fetch(`${BACKEND_URL}/conversations/${conv.id}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.log('Error fetching messages:', err);
      }
    } else {
      // Start a clean slate chat
      setActiveConversation(null);
      setMessages([]);
      setStreamedContent('');
    }
  };

  // Image attachment
  const pickImage = async (useCamera = false) => {
    const { status } = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'PEL app needs camera/gallery access.');
      return;
    }

    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: true,
      quality: 0.5,
      maxWidth: 800,
      maxHeight: 800
    };

    let result = useCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!result.canceled) {
      setImage(result.assets[0]);
    }
  };

  const showAttachmentOptions = () => {
    Alert.alert(
      'Attach Photo',
      'Choose image source',
      [
        { text: 'Take Photo (Camera)', onPress: () => pickImage(true) },
        { text: 'Choose from Gallery', onPress: () => pickImage(false) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // TTS playback
  const playSpeech = async (msgId, text) => {
    if (playingMessageId === msgId) {
      Speech.stop();
      setPlayingMessageId(null);
      return;
    }

    if (playingMessageId !== null) {
      Speech.stop();
    }

    setPlayingMessageId(msgId);

    const cleanText = text.replace(/🔧/g, '').replace(/Escalation Contacts:/g, '');
    const isUrdu = /[\u0600-\u06FF]/.test(cleanText) || 
                   cleanText.toLowerCase().includes('hai') || 
                   cleanText.toLowerCase().includes('ki') || 
                   cleanText.toLowerCase().includes('tha');

    Speech.speak(cleanText, {
      language: isUrdu ? 'ur-PK' : 'en-US',
      onDone: () => setPlayingMessageId(null),
      onError: () => setPlayingMessageId(null),
      onStopped: () => setPlayingMessageId(null)
    });
  };

  // Real STT Voice Recording
  const startRecording = async () => {
    try {
      if (isStartingRecording.current || isRecording) return;
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'PEL app needs microphone access.');
        return;
      }
      
      isStartingRecording.current = true;
      shouldStopImmediately.current = false;
      setIsRecording(true);

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      isStartingRecording.current = false;

      if (shouldStopImmediately.current) {
        await finishRecording();
      }
    } catch (err) {
      isStartingRecording.current = false;
      setIsRecording(false);
    }
  };

  const finishRecording = async () => {
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) return;
      
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        handleSend(null, base64Data);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.log('Recording stopped too quickly, discarding.');
    }
  };

  const stopRecordingAndSend = async () => {
    setTimeout(async () => {
      setIsRecording(false);
      if (isStartingRecording.current) {
        shouldStopImmediately.current = true;
        return;
      }
      if (audioRecorder.isRecording) {
        await finishRecording();
      }
    }, 200);
  };

  // SSE Stream Message Query Sender
  const handleSend = async (queryParam = null, audioBase64Param = null) => {
    const queryText = queryParam !== null ? queryParam : input;
    if (!queryText.trim() && !image && !audioBase64Param) return;

    let convId = activeConversation?.id;

    if (!convId) {
      try {
        const res = await fetch(`${BACKEND_URL}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: input.substring(0, 50) || 'New Conversation'
          })
        });
        if (res.ok) {
          const newConv = await res.json();
          convId = newConv.id;
          setActiveConversation(newConv);
          fetchConversations();
        } else {
          Alert.alert('Error', 'Unable to start conversation.');
          return;
        }
      } catch (err) {
        Alert.alert('Network Error', 'PEL backend is offline.');
        return;
      }
    }

    const base64Img = image ? image.base64 : null;
    const imageUri = image ? image.uri : null;

    const userMsgId = Date.now();
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: 'user',
      content: audioBase64Param ? '🎤 Voice Message' : queryText,
      image_url: imageUri,
      created_at: new Date().toISOString()
    }]);

    setInput('');
    setImage(null);
    setThinking(true);
    setStreamedContent('');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_URL}/conversations/${convId}/query`);
    xhr.setRequestHeader('Content-Type', 'application/json');

    let processedCount = 0;

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        const blocks = xhr.responseText.split('\n\n');
        while (processedCount < blocks.length - 1 || (xhr.readyState === 4 && processedCount < blocks.length)) {
          const block = blocks[processedCount];
          if (block.trim()) {
            let event = '';
            let data = '';
            for (const line of block.split('\n')) {
              if (line.startsWith('event:')) {
                event = line.substring(6).trim();
              } else if (line.startsWith('data:')) {
                data = line.substring(5).trim();
              }
            }
            if (event === 'thinking') {
              setThinking(true);
            } else if (event === 'content') {
              setThinking(false);
              try {
                const chunk = JSON.parse(data);
                setStreamedContent(prev => prev + chunk);
              } catch (e) {
                setStreamedContent(prev => prev + data);
              }
            } else if (event === 'client_action') {
              // no-op
            } else if (event === 'done') {
              setThinking(false);
              try {
                const doneObj = JSON.parse(data);
                setMessages(prev => [...prev, {
                  id: Date.now() + 1,
                  role: 'assistant',
                  content: doneObj.response,
                  escalate: doneObj.escalate,
                  created_at: new Date().toISOString()
                }]);
                setStreamedContent('');
              } catch (e) {}
            }
          }
          processedCount++;
        }
      }
    };

    xhr.onerror = () => {
      setThinking(false);
      Alert.alert('Network Error', 'PEL backend is offline.');
    };

    xhr.send(JSON.stringify({
      query: queryText || 'Transcribe and respond to this audio',
      model: selectedModel,
      image_base64: base64Img,
      audio_base64: audioBase64Param
    }));
  };

  return (
    <View style={styles.container}>
      {/* Slide-in Drawer for Conversation History */}
      {drawerOpen && (
        <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerTranslateX }] }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Conversations</Text>
              <TouchableOpacity onPress={() => toggleDrawer(false)}>
                <Lucide name="x" size={24} color={theme.colors.accentIcon} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.newChatBtn}
              onPress={() => {
                toggleDrawer(false);
                openChatOverlay(null);
              }}
            >
              <Lucide name="plus" size={20} color={theme.colors.textPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.newChatBtnText}>New Chat</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={{ padding: 15 }}>
              {conversations.length === 0 ? (
                <Text style={styles.emptyText}>No previous chats</Text>
              ) : (
                conversations.map(conv => (
                  <TouchableOpacity
                    key={conv.id}
                    style={[styles.drawerItem, activeConversation?.id === conv.id && styles.drawerItemActive]}
                    onPress={() => {
                      toggleDrawer(false);
                      openChatOverlay(conv);
                    }}
                    onLongPress={() => deleteConversation(conv.id)}
                  >
                    <Lucide name="message-square" size={16} color={theme.colors.accentIcon} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.drawerItemText} numberOfLines={1}>
                        {conv.title || 'Untitled Chat'}
                      </Text>
                      <Text style={styles.drawerItemDate}>
                        {conv.updated_at ? conv.updated_at.split('T')[0] : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      )}

      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          <View style={styles.chatNavbar}>
            <TouchableOpacity onPress={() => toggleDrawer(true)}>
              <Lucide name="menu" size={24} color={theme.colors.accentIcon} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.chatTitleText}>PEL Product Knowledge Agent</Text>
            </View>
            <TouchableOpacity onPress={onNavigateSettings}>
              <Lucide name="settings" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Messages Thread */}
          <ScrollView
            ref={scrollViewRef}
            testID="chat-scroll-view"
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 && !thinking && !streamedContent && (
              <EmptyStateOrb />
            )}

            {messages.map(msg => (
              <ChatBubble 
                key={msg.id} 
                msg={msg} 
                onImageZoom={setZoomedImage}
                playingMessageId={playingMessageId}
                onPlaySpeech={playSpeech}
              />
            ))}

            {/* Streamed chunk display */}
            {streamedContent.length > 0 && (
              <ChatBubble 
                msg={{ role: 'assistant', content: streamedContent, id: 'stream' }} 
              />
            )}

            {/* Thinking loader */}
            {thinking && (
              <View style={styles.thinkingBubble}>
                <View style={styles.dotPulse} />
                <Text style={styles.thinkingText}>PEL Product Knowledge Agent is thinking...</Text>
              </View>
            )}
          </ScrollView>

          {/* Thumbnail preview of image attachment */}
          {image && (
            <View style={styles.previewAttachmentRow}>
              <Image source={{ uri: image.uri }} style={styles.previewThumbnail} />
              <Text style={styles.previewAttachmentLabel}>Photo attached</Text>
              <TouchableOpacity onPress={() => setImage(null)}>
                <Lucide name="x" size={20} color={theme.colors.statusDanger} />
              </TouchableOpacity>
            </View>
          )}

          {/* Floating input capsule */}
          <InputCapsule 
            input={input}
            setInput={setInput}
            isRecording={isRecording}
            onAttachPress={showAttachmentOptions}
            onMicPressIn={startRecording}
            onMicPressOut={stopRecordingAndSend}
            onSend={() => handleSend()}
          />
        </SafeAreaView>

      {/* Multimodal Zoom Image Modal Viewer */}
      {zoomedImage !== null && (
        <Modal transparent visible={zoomedImage !== null} animationType="fade">
          <View style={styles.zoomModalBackground}>
            <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setZoomedImage(null)}>
              <Lucide name="x" size={30} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Image source={{ uri: zoomedImage }} style={styles.zoomModalImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgApp,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: theme.colors.surfaceCard,
    borderRightWidth: 1,
    borderRightColor: theme.colors.borderDefault,
    zIndex: 99,
    paddingTop: Platform.OS === 'ios' ? 40 : 10
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault
  },
  drawerTitle: {
    color: theme.colors.textPrimary,
    ...theme.typography.title,
  },
  newChatBtn: {
    backgroundColor: theme.colors.surfaceSunken,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault,
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  newChatBtnText: {
    color: theme.colors.textPrimary,
    ...theme.typography.bodyStrong
  },
  emptyText: {
    color: theme.colors.textSecondary,
    ...theme.typography.body,
    marginTop: 10,
    marginBottom: 20
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: theme.radius.md,
    marginVertical: 4
  },
  drawerItemActive: {
    backgroundColor: theme.colors.surfaceSunken,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault
  },
  drawerItemText: {
    color: theme.colors.textPrimary,
    ...theme.typography.bodyStrong
  },
  drawerItemDate: {
    color: theme.colors.textTertiary,
    ...theme.typography.micro,
    marginTop: 2
  },
  chatNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault,
    backgroundColor: theme.colors.surfaceBackground
  },
  chatTitleText: {
    color: theme.colors.textPrimary,
    ...theme.typography.heading
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceCard,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault
  },
  dotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accentIcon,
    marginRight: 8
  },
  thinkingText: {
    color: theme.colors.textSecondary,
    ...theme.typography.caption
  },
  previewAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceCard,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderDefault
  },
  previewThumbnail: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm
  },
  previewAttachmentLabel: {
    color: theme.colors.textSecondary,
    ...theme.typography.body,
    marginLeft: 15,
    flex: 1
  },
  zoomModalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  zoomCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10
  },
  zoomModalImage: {
    width: '100%',
    height: '80%'
  }
});
