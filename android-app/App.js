import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  StatusBar, Animated, Dimensions, RefreshControl, Modal, BackHandler, Linking
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { Feather as Lucide } from '@expo/vector-icons';
import Constants from 'expo-constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getBackendUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8000`;
  }
  // Try to use common local IPs for Expo Go, fallback to 10.0.2.2 for Android emulator
  // Note: On physical devices without EXPO_PUBLIC_API_URL, localhost/10.0.2.2 will fail.
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
};

const BACKEND_URL = getBackendUrl();

export default function App() {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isStartingRecording = useRef(false);
  const shouldStopImmediately = useRef(false);

  // Navigation & Screen transitions
  const [screen, setScreen] = useState('chat'); // 'chat' | 'settings'
  const [refreshing, setRefreshing] = useState(false);

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
  const [emptyOrbPulse] = useState(new Animated.Value(1));
  const [selectedUrduVoice, setSelectedUrduVoice] = useState(false);

  // Modal Viewers
  const [zoomedImage, setZoomedImage] = useState(null);



  // Animation values
  const drawerTranslateX = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Scroll ref
  const scrollViewRef = useRef();

  useEffect(() => {
    fetchInitialData();
  }, []);



  // Empty state orb pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(emptyOrbPulse, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true
        }),
        Animated.timing(emptyOrbPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true
        })
      ])
    ).start();
  }, [emptyOrbPulse]);

  // Handle Android Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      if (zoomedImage !== null) {
        setZoomedImage(null);
        return true;
      }
      if (isRecording) {
        // cannot cancel recording via back button easily, just let it be
        return true;
      }
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      if (screen !== 'chat') {
        setScreen('chat');
        return true;
      }
      return false; // Exit app
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [drawerOpen, zoomedImage, isRecording, screen]);

  const fetchInitialData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchConversations()
    ]);
    setRefreshing(false);
  };



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
    setScreen('chat');

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

    // Simple language detection (English vs Roman Urdu / Urdu)
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

      // If user released the button while we were preparing to record, stop it immediately
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
      // Suppress the error if the user taps too fast before MediaRecorder can properly initialize
      console.log('Recording stopped too quickly, discarding.');
    }
  };

  const stopRecordingAndSend = async () => {
    // delay the stop briefly to prevent fast tap crashing native module
    setTimeout(async () => {
      setIsRecording(false);
      
      if (isStartingRecording.current) {
        // Still setting up, so queue the stop
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

    // 1. Create conversation first if not exists
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

    // Optimistic user bubble update
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

    // Setup Custom XMLHttpRequest to stream responses sequentially
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
              try {
                const actionData = JSON.parse(data);
                if (actionData.action === 'tool_result') {
                  // External API call succeeded, no local UI update needed
                }
              } catch (e) {
                console.log('Error parsing client_action', e);
              }
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
    <SafeAreaProvider>
    <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Settings / Profile Screen */}
      {screen === 'settings' && (
        <View style={{ flex: 1, padding: 20 }}>
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setScreen('chat')}>
              <Lucide name="arrow-left" size={24} color="#007DC5" />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>Profile & Settings</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.profileBox}>
            <View style={styles.avatar}>
              <Lucide name="user" size={40} color="#E4E4E4" />
            </View>
            <Text style={styles.profileName}>PEL Smart Customer</Text>
            <Text style={styles.profileEmail}>customer.support@pel.com.pk</Text>
          </View>

          <View style={styles.settingsSection}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Language</Text>
              <Text style={styles.settingValue}>English (Roman Urdu)</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>App Version</Text>
              <Text style={styles.settingValue}>v2.0.4 - Premium</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Branding</Text>
              <Text style={styles.settingValue}>Lochmara Blue Suite</Text>
            </View>
          </View>
        </View>
      )}





      {/* Slide-in Drawer for Conversation History */}
      {drawerOpen && (
        <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerTranslateX }] }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Conversations</Text>
              <TouchableOpacity onPress={() => toggleDrawer(false)}>
                <Lucide name="x" size={24} color="#007DC5" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.newChatBtn}
              onPress={() => {
                toggleDrawer(false);
                openChatOverlay(null);
              }}
            >
              <Lucide name="plus" size={20} color="#FFF" style={{ marginRight: 8 }} />
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
                    <Lucide name="message-square" size={16} color="#007DC5" style={{ marginRight: 10 }} />
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

      {/* Main Chat Screen */}
      {screen === 'chat' && (
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 30}
            style={{ flex: 1 }}
          >
            <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.chatNavbar}>
              <TouchableOpacity onPress={() => toggleDrawer(true)}>
                <Lucide name="menu" size={24} color="#007DC5" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.chatTitleText}>PEL Product Knowledge Agent</Text>
              </View>
              <TouchableOpacity onPress={() => setScreen('settings')}>
                <Lucide name="settings" size={24} color="#E4E4E4" />
              </TouchableOpacity>
            </View>

            {/* Messages Thread */}
            <ScrollView
              ref={scrollViewRef}
              testID="chat-scroll-view"
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 && !thinking && !streamedContent && (
                <View style={styles.emptyChatBox}>
                  <Animated.View style={[styles.emptyOrb, { transform: [{ scale: emptyOrbPulse }] }]}>
                    {/* Using an inline styled Text as a placeholder for the logo. The user can also use an Image here if an asset is added. */}
                    <View style={styles.pelLogoOuter}>
                      <View style={styles.pelLogoInner}>
                        <Text style={styles.pelLogoText}>PEL</Text>
                      </View>
                    </View>
                  </Animated.View>
                  <Text style={styles.emptyChatTitle}>PEL Product Knowledge Agent</Text>
                  <Text style={styles.emptyChatDesc}>
                    How can I help you with your PEL appliance today?
                  </Text>
                </View>
              )}

              {messages.map(msg => (
                <View key={msg.id} style={[styles.bubbleWrapper, msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                  <View style={[styles.bubbleContent, msg.role === 'user' ? styles.bubbleContentUser : styles.bubbleContentBot]}>
                    {msg.image_url && (
                      <TouchableOpacity onPress={() => setZoomedImage(msg.image_url)}>
                        <Image source={{ uri: msg.image_url }} style={styles.bubbleImage} />
                      </TouchableOpacity>
                    )}
                    
                    {/* TTS Button on Assistant response */}
                    {msg.role === 'assistant' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <TouchableOpacity
                          style={styles.ttsBtn}
                          onPress={() => playSpeech(msg.id, msg.content)}
                        >
                          <Lucide 
                            name={playingMessageId === msg.id ? 'stop-circle' : 'volume-2'} 
                            size={16} 
                            color="#007DC5" 
                          />
                        </TouchableOpacity>
                        {playingMessageId === msg.id && (
                          <View style={styles.waveformContainer}>
                            {/* Subtle Waveform Animation Bars */}
                            {[10, 18, 12, 16, 8].map((h, i) => (
                              <View key={i} style={[styles.waveformBar, { height: h }]} />
                            ))}
                          </View>
                        )}
                      </View>
                    )}

                    <Text style={msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot}>
                      {msg.content}
                    </Text>

                  </View>
                </View>
              ))}

              {/* Streamed chunk display */}
              {streamedContent.length > 0 && (
                <View style={[styles.bubbleWrapper, styles.bubbleBot]}>
                  <View style={[styles.bubbleContent, styles.bubbleContentBot]}>
                    <Text style={styles.bubbleTextBot}>{streamedContent}</Text>
                  </View>
                </View>
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
                  <Lucide name="x" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {/* Floating input capsule */}
            <View style={styles.chatInputWrapper}>
              <View style={styles.capsuleBar}>
                <TouchableOpacity onPress={showAttachmentOptions} style={styles.capsuleAction}>
                  <Lucide name="camera" size={20} color="#888" />
                </TouchableOpacity>
                <TextInput
                  style={styles.capsuleTextInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask a query, describe issue..."
                  placeholderTextColor="#555"
                />
                <TouchableOpacity 
                  testID="mic-button"
                  onPressIn={startRecording}
                  onPressOut={stopRecordingAndSend}
                  style={[styles.capsuleAction, { marginRight: 5, backgroundColor: isRecording ? '#ef4444' : 'transparent', borderRadius: 20 }]}
                >
                  <Lucide name="mic" size={20} color={isRecording ? '#FFF' : '#888'} />
                </TouchableOpacity>
                <TouchableOpacity testID="send-button" onPress={() => handleSend()} style={styles.capsuleSend}>
                  <Lucide name="send" size={20} color="#007DC5" />
                </TouchableOpacity>
              </View>
            </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </View>
      )}

      {/* Multimodal Zoom Image Modal Viewer */}
      {zoomedImage !== null && (
        <Modal transparent visible={zoomedImage !== null} animationType="fade">
          <View style={styles.zoomModalBackground}>
            <TouchableOpacity style={styles.zoomCloseBtn} onPress={() => setZoomedImage(null)}>
              <Lucide name="x" size={30} color="#FFF" />
            </TouchableOpacity>
            <Image source={{ uri: zoomedImage }} style={styles.zoomModalImage} resizeMode="contain" />
          </View>
        </Modal>
      )}
    </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 0,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    backgroundColor: '#0A0A0A'
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007DC5',
    letterSpacing: 2
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  heroSection: {
    padding: 20,
    backgroundColor: '#111111',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10
  },
  welcomeText: {
    fontSize: 14,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 4
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E4E4E4',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  linkText: {
    fontSize: 14,
    color: '#007DC5',
    fontWeight: '600'
  },
  emptyCard: {
    backgroundColor: '#111111',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 20
  },
  miniBtn: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#007DC5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  miniBtnText: {
    color: '#007DC5',
    fontSize: 13,
    fontWeight: '600'
  },
  gridContainer: {
    paddingHorizontal: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  appCard: {
    backgroundColor: '#111111',
    width: '45%',
    marginHorizontal: '2.5%',
    marginVertical: 8,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#1A1A1A'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  badgePulse: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700'
  },
  appCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF'
  },
  appCardModel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  appCardServiced: {
    fontSize: 11,
    color: '#555',
    marginTop: 4
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingTop: 10,
    justifyContent: 'space-between'
  },
  cardActionText: {
    color: '#007DC5',
    fontSize: 12,
    fontWeight: '600'
  },
  floatingChatBar: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    backgroundColor: '#007DC5',
    borderRadius: 30,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6
  },
  floatingChatBarText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    flex: 1
  },
  floatingSendBtn: {
    backgroundColor: '#FFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A'
  },
  subHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF'
  },
  profileBox: {
    alignItems: 'center',
    marginVertical: 30
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007DC5'
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 10
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4
  },
  settingsSection: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 10
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1C'
  },
  settingLabel: {
    color: '#E4E4E4',
    fontSize: 14
  },
  settingValue: {
    color: '#666',
    fontSize: 14
  },
  ticketSummaryCard: {
    backgroundColor: '#111',
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A'
  },
  ticketSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF'
  },
  ticketSummaryDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 6
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700'
  },
  miniProgressContainer: {
    height: 4,
    backgroundColor: '#1C1C1C',
    borderRadius: 2,
    marginTop: 12
  },
  miniProgressBar: {
    height: '100%',
    backgroundColor: '#007DC5',
    borderRadius: 2
  },
  timelineCard: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 16,
    marginVertical: 10
  },
  timelineCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF'
  },
  timelineCardDate: {
    fontSize: 12,
    color: '#555',
    marginTop: 4
  },
  timelineCardDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 10,
    marginBottom: 20
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative'
  },
  stepCol: {
    alignItems: 'center',
    flex: 1
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333'
  },
  stepDotActive: {
    backgroundColor: '#007DC5',
    borderColor: '#007DC5'
  },
  stepLabel: {
    fontSize: 9,
    color: '#444',
    marginTop: 6
  },
  stepLabelActive: {
    color: '#007DC5',
    fontWeight: '600'
  },
  formContainer: {
    padding: 20
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginTop: 15,
    marginBottom: 6
  },
  formInput: {
    backgroundColor: '#111',
    color: '#FFF',
    padding: 14,
    borderRadius: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  formTextArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  selectorChip: {
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  selectorChipActive: {
    backgroundColor: '#007DC5',
    borderColor: '#007DC5'
  },
  selectorChipText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600'
  },
  selectorChipTextActive: {
    color: '#FFF'
  },
  submitBtn: {
    backgroundColor: '#007DC5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700'
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99
  },
  modalContent: {
    backgroundColor: '#0A0A0A',
    width: '90%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C1C1C',
    overflow: 'hidden',
    paddingBottom: 20
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A'
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  },
  scannerWrapper: {
    padding: 30,
    alignItems: 'center',
    height: 300,
    justifyContent: 'center'
  },
  cameraBox: {
    width: 220,
    height: 220,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007DC5',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative'
  },
  scannerText: {
    color: '#666',
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center'
  },
  scannerScanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4
  },
  scanBtn: {
    backgroundColor: '#007DC5',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16
  },
  scanBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 15
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: '#0A0A0A',
    borderRightWidth: 1,
    borderRightColor: '#1A1A1A',
    zIndex: 99,
    paddingTop: Platform.OS === 'ios' ? 40 : 10
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A'
  },
  drawerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700'
  },
  newChatBtn: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#007DC5',
    margin: 15,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  newChatBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600'
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginVertical: 4
  },
  drawerItemActive: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  drawerItemText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600'
  },
  drawerItemDate: {
    color: '#555',
    fontSize: 11,
    marginTop: 2
  },
  chatOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0A0A0A',
    zIndex: 100,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
  },
  chatNavbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    backgroundColor: '#0A0A0A'
  },
  chatTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF'
  },
  chatSubtitleText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  navLinkText: {
    color: '#007DC5',
    fontSize: 14,
    fontWeight: '600'
  },
  emptyChatBox: {
    alignItems: 'center',
    paddingVertical: 60
  },
  pelLogoOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007DC5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pelLogoInner: {
    width: 50,
    height: 34,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pelLogoText: {
    color: '#007DC5',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007DC5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#007DC5',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8
  },
  emptyChatTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1
  },
  emptyChatDesc: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 30
  },
  bubbleWrapper: {
    marginVertical: 8,
    width: '100%',
    flexDirection: 'row'
  },
  bubbleUser: {
    justifyContent: 'flex-end'
  },
  bubbleBot: {
    justifyContent: 'flex-start'
  },
  bubbleContent: {
    padding: 15,
    borderRadius: 16,
    maxWidth: '85%'
  },
  bubbleContentUser: {
    backgroundColor: '#007DC5',
    borderBottomRightRadius: 2
  },
  bubbleContentBot: {
    backgroundColor: '#111',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  bubbleTextUser: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20
  },
  bubbleTextBot: {
    color: '#E4E4E4',
    fontSize: 14,
    lineHeight: 20
  },
  bubbleImage: {
    width: 200,
    height: 160,
    borderRadius: 12,
    marginBottom: 10
  },
  humanTicketBtn: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center'
  },
  humanTicketBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700'
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  dotPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007DC5',
    marginRight: 8
  },
  thinkingText: {
    color: '#555',
    fontSize: 13
  },
  previewAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#1C1C1C'
  },
  previewThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8
  },
  previewAttachmentLabel: {
    color: '#888',
    fontSize: 14,
    marginLeft: 15,
    flex: 1
  },
  chatInputWrapper: {
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    backgroundColor: '#0A0A0A'
  },
  capsuleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 30,
    height: 56,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  capsuleAction: {
    padding: 10
  },
  capsuleTextInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    paddingHorizontal: 10
  },
  capsuleSend: {
    padding: 10
  },
  // STT Simulated Microphone Styles
  micModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
    padding: 20
  },
  micModalContent: {
    backgroundColor: '#111',
    borderRadius: 24,
    padding: 30,
    width: '90%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  micModalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 20
  },
  micPulseContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    position: 'relative'
  },
  micPulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007DC5',
    opacity: 0.3
  },
  micBtnInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007DC5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007DC5',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8
  },
  micModalSub: {
    color: '#E4E4E4',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 25
  },
  micSelectorHeader: {
    color: '#666',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
    marginBottom: 10
  },
  micTranscriptChip: {
    backgroundColor: '#1A1A1A',
    width: '100%',
    padding: 15,
    borderRadius: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  micTranscriptText: {
    color: '#FFF',
    fontSize: 13,
    lineHeight: 18
  },
  // TTS Waveform styles
  ttsBtn: {
    padding: 4,
    marginRight: 8
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#007DC5',
    marginHorizontal: 1,
    borderRadius: 1
  },
  // Zoom Modal Styles
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
