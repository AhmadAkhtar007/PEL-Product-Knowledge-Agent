import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, SafeAreaView, KeyboardAvoidingView, Platform,
  Linking, Image, Dimensions, RefreshControl, Modal, Animated, BackHandler
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { Feather as Lucide } from '@expo/vector-icons';
import Constants from 'expo-constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getBackendUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri ? hostUri.split(':')[0] : 'localhost';
  return `http://${host}:8000`;
};

const BACKEND_URL = getBackendUrl();

export default function App() {
  const [screen, setScreen] = useState('home'); // 'home' | 'chat' | 'tickets' | 'ticket_detail' | 'directory' | 'service_history' | 'parts'
  const [refreshing, setRefreshing] = useState(false);

  // Database lists
  const [tickets, setTickets] = useState([]);
  const [experts, setExperts] = useState([]);
  const [parts, setParts] = useState([]);
  const [serviceHistory, setServiceHistory] = useState([]);
  
  // Active/Detail views
  const [activeTicket, setActiveTicket] = useState(null);
  
  // Diagnostic Chatbot state
  const [messages, setMessages] = useState([
    { id: '1', role: 'assistant', content: 'PEL Technician Diagnostics Core active. Enter fault code, component description, or wiring check.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [chatModel, setChatModel] = useState('PR-1950');
  const [thinking, setThinking] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [activeConversationId, setActiveConversationId] = useState(null);

  // Voice & Modal States
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingPulse] = useState(new Animated.Value(1));
  const [zoomedImage, setZoomedImage] = useState(null);

  // Filter & Search states
  const [ticketFilter, setTicketFilter] = useState('all'); // 'all' | 'new' | 'assigned' | 'in_progress' | 'resolved'
  const [partsSearch, setPartsSearch] = useState('');
  const [partsCategory, setPartsCategory] = useState('all');
  const [historyCategory, setHistoryCategory] = useState('all');

  // Form states
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');
  const [serviceModel, setServiceModel] = useState('PR-1950');
  const [serviceCategory, setServiceCategory] = useState('Refrigerator');
  const [servicePhotos, setServicePhotos] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Voice STT recording pulse animation
  useEffect(() => {
    if (recording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulse, {
            toValue: 1.4,
            duration: 800,
            useNativeDriver: true
          }),
          Animated.timing(recordingPulse, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      recordingPulse.setValue(1);
    }
  }, [recording]);

  // Handle Android Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      if (zoomedImage !== null) {
        setZoomedImage(null);
        return true;
      }
      if (recording) {
        setRecording(false);
        return true;
      }
      if (screen !== 'home') {
        setScreen('home');
        return true;
      }
      return false; // Exit app
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [zoomedImage, recording, screen]);

  const fetchInitialData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchTickets(),
      fetchExperts(),
      fetchParts(),
      fetchServiceHistory()
    ]);
    setRefreshing(false);
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/tickets`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (e) {
      console.log('Error fetching tickets:', e);
    }
  };

  const fetchExperts = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/experts`);
      if (res.ok) {
        const data = await res.json();
        setExperts(data);
      }
    } catch (e) {
      console.log('Error fetching experts:', e);
    }
  };

  const fetchParts = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/parts`);
      if (res.ok) {
        const data = await res.json();
        setParts(data);
      }
    } catch (e) {
      console.log('Error fetching parts:', e);
    }
  };

  const fetchServiceHistory = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/service-history`);
      if (res.ok) {
        const data = await res.json();
        setServiceHistory(data);
      }
    } catch (e) {
      console.log('Error fetching service history:', e);
    }
  };

  // Image pickers
  const pickChatImage = async (useCamera = false) => {
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
      setChatImage(result.assets[0]);
    }
  };

  const showAttachmentOptions = () => {
    Alert.alert(
      'Attach Photo',
      'Choose image source',
      [
        { text: 'Take Photo (Camera)', onPress: () => pickChatImage(true) },
        { text: 'Choose from Gallery', onPress: () => pickChatImage(false) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const pickServicePhoto = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: true,
      quality: 0.5,
      maxWidth: 800,
      maxHeight: 800
    });
    if (!result.canceled) {
      setServicePhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  // TTS speech output
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

  // STT Simulated Voice overlay
  const triggerVoiceRecord = () => {
    setRecording(true);
  };

  const selectVoiceTranscript = (text) => {
    setChatInput(text);
    setRecording(false);
  };

  // Diagnostic Streaming Chat Submit
  const handleChatSend = async () => {
    if (!chatInput.trim() && !chatImage) return;

    let convId = activeConversationId;
    if (!convId) {
      try {
        const res = await fetch(`${BACKEND_URL}/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'technician',
            title: chatInput.substring(0, 50) || 'Technician Diagnostic'
          })
        });
        if (res.ok) {
          const newConv = await res.json();
          convId = newConv.id;
          setActiveConversationId(convId);
        }
      } catch (e) {
        Alert.alert('Offline Error', 'Could not initialize session.');
        return;
      }
    }

    const queryText = chatInput;
    const base64Img = chatImage ? chatImage.base64 : null;
    const imgUri = chatImage ? chatImage.uri : null;

    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      content: queryText,
      image_url: imgUri
    }]);

    setChatInput('');
    setChatImage(null);
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
            } else if (event === 'done') {
              setThinking(false);
              try {
                const doneObj = JSON.parse(data);
                
                let textReply = doneObj.response;
                if (doneObj.expert_contacts && doneObj.expert_contacts.length > 0) {
                  textReply += '\n\n🔧 Escalation Contacts:\n' + 
                    doneObj.expert_contacts.map(e => `- ${e.name} (${e.role_title}): ${e.phone}`).join('\n');
                }

                setMessages(prev => [...prev, {
                  id: Date.now() + 1,
                  role: 'assistant',
                  content: textReply
                }]);
                setStreamedContent('');
              } catch (e) {}
            }
          }
          processedCount++;
        }
      }
    };

    xhr.send(JSON.stringify({
      query: queryText,
      role: 'technician',
      model: chatModel,
      image_base64: base64Img
    }));
  };

  // Advanced Ticket Status transition (state machine constraints validation)
  const updateTicketStatus = async (newStatus) => {
    if (!activeTicket) return;
    try {
      const res = await fetch(`${BACKEND_URL}/tickets/${activeTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: resolutionNotes || activeTicket.notes
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveTicket(updated);
        Alert.alert('Status Updated', `Ticket advanced to status: ${newStatus.toUpperCase()}`);
        setResolutionNotes('');
        fetchTickets();
      } else {
        const errorData = await res.json();
        Alert.alert('Transition Refused', errorData.detail || 'Invalid status transition.');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Server unreachable.');
    }
  };

  // Submit Service repair history log
  const submitServiceRecord = async () => {
    if (!serviceNotes) {
      Alert.alert('Error', 'Please enter repair descriptions.');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/service-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appliance_id: activeTicket?.appliance_id || 1,
          ticket_id: activeTicket?.id || null,
          technician_name: 'Ahmad Akhtar',
          description: `Category: ${serviceCategory} | Model: ${serviceModel} | Notes: ${serviceNotes}`,
          photos_json: JSON.stringify(servicePhotos)
        })
      });
      if (res.ok) {
        Alert.alert('Success', 'Repair logged to Service History.');
        setServiceNotes('');
        setServicePhotos([]);
        setScreen('home');
        fetchServiceHistory();
      } else {
        Alert.alert('Error', 'Could not create service record.');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Server unreachable.');
    }
  };

  // Counts for Stats dashboard
  const pendingCount = tickets.filter(t => t.status === 'new' || t.status === 'assigned').length;
  const completedToday = serviceHistory.length; // repairs logged
  const escalatedCount = tickets.filter(t => t.status === 'in_progress').length;

  const getMockTranscripts = (model) => {
    const m = (model || '').toLowerCase();
    if (m.includes('washing')) return ['Drum motor resistance values', 'Drain pump voltage test points', 'Error code UE unbalanced load'];
    if (m.includes('dispenser') || m.includes('water')) return ['Heating element continuity check', 'Thermostat bypass testing', 'Compressor relay diagnostics'];
    if (m.includes('purifier')) return ['HEPA filter sensor calibration', 'Blower motor voltage checks', 'Air quality sensor replacement guide'];
    if (m.includes('freezer') || m.includes('deep')) return ['Capillary tube blockage symptoms', 'Defrost heater resistance chart', 'Thermostat wiring diagram'];
    if (m.includes('tv') || m.includes('led')) return ['T-CON board voltage points', 'Backlight inverter board diagnostics', 'Mainboard firmware flashing guide'];
    if (m.includes('microwave') || m.includes('oven')) return ['Magnetron high voltage diode testing', 'Door switch continuity matrix', 'Transformer primary/secondary resistance'];
    if (m.includes('ac') || m.includes('pinv') || m.includes('air conditioner')) return [`${model} error E1 meaning`, 'AC compressor wiring circuit board diagnostics', 'F1 ambient temperature resistance chart'];
    // Default to refrigerator
    return [`What is the resistance value of the ${model} defrost sensor?`, 'How to check compressor capacitor specs?', 'Error code F1 checks'];
  };
  const mockTranscripts = getMockTranscripts(chatModel);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* 1. HOME DASHBOARD SCREEN */}
      {screen === 'home' && (
        <View style={{ flex: 1 }}>
          <View style={styles.navbar}>
            <Text style={styles.navTitle}>PEL TECH CONSOLE</Text>
            <TouchableOpacity onPress={fetchInitialData}>
              <Lucide name="rotate-cw" size={20} color="#007DC5" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchInitialData} tintColor="#007DC5" />}
          >
            {/* Numeric Stats Dashboard Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statVal}>{pendingCount}</Text>
                <Text style={styles.statLabel}>Pending Tickets</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: '#10B981' }]}>{completedToday}</Text>
                <Text style={styles.statLabel}>Repairs Logged</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statVal, { color: '#F97316' }]}>{escalatedCount}</Text>
                <Text style={styles.statLabel}>In Progress</Text>
              </View>
            </View>

            {/* Quick Actions grids */}
            <Text style={styles.sectionHeader}>Quick Console Actions</Text>
            <View style={styles.gridRow}>
              <TouchableOpacity style={styles.gridBtn} onPress={() => setScreen('chat')}>
                <Lucide name="cpu" size={24} color="#007DC5" style={{ marginBottom: 8 }} />
                <Text style={styles.gridBtnText}>AI Diagnostic</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => setScreen('tickets')}>
                <Lucide name="list" size={24} color="#007DC5" style={{ marginBottom: 8 }} />
                <Text style={styles.gridBtnText}>Ticket Board</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => setScreen('directory')}>
                <Lucide name="users" size={24} color="#007DC5" style={{ marginBottom: 8 }} />
                <Text style={styles.gridBtnText}>Experts Directory</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.gridRow}>
              <TouchableOpacity style={styles.gridBtn} onPress={() => setScreen('parts')}>
                <Lucide name="box" size={24} color="#007DC5" style={{ marginBottom: 8 }} />
                <Text style={styles.gridBtnText}>Parts Catalog</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.gridBtn} onPress={() => setScreen('service_history')}>
                <Lucide name="archive" size={24} color="#007DC5" style={{ marginBottom: 8 }} />
                <Text style={styles.gridBtnText}>Service Logs</Text>
              </TouchableOpacity>
              <View style={{ width: '30%', marginHorizontal: '1.5%' }} />
            </View>

            {/* Pending Tickets Summary list */}
            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionHeader}>Top Pending Complaints</Text>
              <TouchableOpacity onPress={() => setScreen('tickets')}>
                <Text style={styles.linkText}>View All</Text>
              </TouchableOpacity>
            </View>

            {tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').slice(0, 4).map(ticket => (
              <TouchableOpacity 
                key={ticket.id} 
                style={styles.techTicketCard}
                onPress={() => {
                  setActiveTicket(ticket);
                  setScreen('ticket_detail');
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.techTicketModel}>Model: {ticket.appliance_model}</Text>
                  <View style={[styles.statusBadge, {
                    backgroundColor: 
                      ticket.status === 'new' ? '#007DC5' :
                      ticket.status === 'assigned' ? '#FBBF24' :
                      ticket.status === 'in_progress' ? '#F97316' : '#6B7280'
                  }]}>
                    <Text style={styles.statusBadgeText}>{ticket.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.techTicketClient}>Client: {ticket.customer_name} | {ticket.phone}</Text>
                <Text style={styles.techTicketDesc} numberOfLines={1}>{ticket.issue_description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 2. TECHNICAL DIAGNOSTICS CHAT */}
      {screen === 'chat' && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Lucide name="arrow-left" size={24} color="#007DC5" />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>Diagnostics Core</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Model selector tabs */}
          <View style={styles.modelTabBar}>
            {['PR-1950', 'Apex 12K', 'PWD-425'].map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.modelTab, chatModel === m && styles.modelTabActive]}
                onPress={() => setChatModel(m)}
              >
                <Text style={[styles.modelTabText, chatModel === m && styles.modelTabTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Diagnostic Messages */}
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {messages.map(msg => (
              <View key={msg.id} style={[styles.bubbleWrapper, msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                <View style={[styles.bubbleContent, msg.role === 'user' ? styles.bubbleContentUser : styles.bubbleContentBot]}>
                  {msg.image_url && (
                    <TouchableOpacity onPress={() => setZoomedImage(msg.image_url)}>
                      <Image source={{ uri: msg.image_url }} style={styles.bubbleImage} />
                    </TouchableOpacity>
                  )}
                  
                  {/* Speaker Button on Assistant bubble */}
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
                          {[10, 18, 12, 16, 8].map((h, i) => (
                            <View key={i} style={[styles.waveformBar, { height: h }]} />
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Monospaced styles for code snippets/specs */}
                  <Text style={[
                    msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot,
                    msg.content.includes('-') && { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13 }
                  ]}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            ))}

            {streamedContent.length > 0 && (
              <View style={[styles.bubbleWrapper, styles.bubbleBot]}>
                <View style={[styles.bubbleContent, styles.bubbleContentBot]}>
                  <Text style={styles.bubbleTextBot}>{streamedContent}</Text>
                </View>
              </View>
            )}

            {thinking && (
              <View style={styles.thinkingBubble}>
                <ActivityIndicator size="small" color="#007DC5" style={{ marginRight: 10 }} />
                <Text style={{ color: '#555' }}>Retrieving resistance wiring specs...</Text>
              </View>
            )}
          </ScrollView>

          {/* Chat Image attachment row */}
          {chatImage && (
            <View style={styles.previewRow}>
              <Image source={{ uri: chatImage.uri }} style={styles.previewThumbnail} />
              <Text style={{ color: '#888', flex: 1, marginLeft: 15 }}>Circuit board attached</Text>
              <TouchableOpacity onPress={() => setChatImage(null)}>
                <Lucide name="x" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputContainer}>
            <View style={styles.capsuleBar}>
              <TouchableOpacity onPress={showAttachmentOptions} style={styles.capsuleAction}>
                <Lucide name="camera" size={20} color="#888" />
              </TouchableOpacity>
              <TextInput
                style={styles.capsuleTextInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Query resistance, fault checks, wiring..."
                placeholderTextColor="#555"
              />
              <TouchableOpacity onPress={triggerVoiceRecord} style={[styles.capsuleAction, { marginRight: 5 }]}>
                <Lucide name="mic" size={20} color="#888" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChatSend} style={styles.capsuleSend}>
                <Lucide name="send" size={20} color="#007DC5" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* 3. TICKET BOARD (All Tickets List) */}
      {screen === 'tickets' && (
        <View style={{ flex: 1 }}>
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Lucide name="arrow-left" size={24} color="#007DC5" />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>Active Complaints Board</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Filter tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabBar}>
            {['all', 'new', 'assigned', 'in_progress', 'resolved'].map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, ticketFilter === f && styles.filterChipActive]}
                onPress={() => setTicketFilter(f)}
              >
                <Text style={[styles.filterChipText, ticketFilter === f && styles.filterChipTextActive]}>
                  {f.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {tickets
              .filter(t => ticketFilter === 'all' || t.status === ticketFilter)
              .map(ticket => (
                <TouchableOpacity
                  key={ticket.id}
                  style={styles.techTicketCard}
                  onPress={() => {
                    setActiveTicket(ticket);
                    setScreen('ticket_detail');
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.techTicketModel}>Model: {ticket.appliance_model}</Text>
                    <View style={[styles.statusBadge, {
                      backgroundColor: 
                        ticket.status === 'new' ? '#007DC5' :
                        ticket.status === 'assigned' ? '#FBBF24' :
                        ticket.status === 'in_progress' ? '#F97316' :
                        ticket.status === 'resolved' ? '#10B981' : '#6B7280'
                    }]}>
                      <Text style={styles.statusBadgeText}>{ticket.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.techTicketClient}>Client: {ticket.customer_name} | {ticket.phone}</Text>
                  <Text style={styles.techTicketDesc}>{ticket.issue_description}</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
      )}

      {/* 4. TICKET DETAILS & STATUS ADVANCEMENT (State transitions constraints) */}
      {screen === 'ticket_detail' && activeTicket && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setScreen('tickets')}>
              <Lucide name="arrow-left" size={24} color="#007DC5" />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>Complaint Details</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>CUSTOMER NAME</Text>
              <Text style={styles.detailVal}>{activeTicket.customer_name}</Text>
              
              <Text style={styles.detailLabel}>PHONE NUMBER</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.detailVal}>{activeTicket.phone}</Text>
                <TouchableOpacity 
                  style={styles.callShortcutBtn}
                  onPress={() => Linking.openURL(`tel:${activeTicket.phone}`)}
                >
                  <Lucide name="phone" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>Call Client</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.detailLabel}>APPLIANCE MODEL</Text>
              <Text style={styles.detailVal}>{activeTicket.appliance_model}</Text>

              <Text style={styles.detailLabel}>ISSUE REPORTED</Text>
              <Text style={styles.detailVal}>{activeTicket.issue_description}</Text>

              <Text style={styles.detailLabel}>CURRENT WORKFLOW STATUS</Text>
              <View style={[styles.statusBadge, {
                alignSelf: 'flex-start',
                backgroundColor: 
                  activeTicket.status === 'new' ? '#007DC5' :
                  activeTicket.status === 'assigned' ? '#FBBF24' :
                  activeTicket.status === 'in_progress' ? '#F97316' :
                  activeTicket.status === 'resolved' ? '#10B981' : '#6B7280'
              }]}>
                <Text style={styles.statusBadgeText}>{activeTicket.status.toUpperCase()}</Text>
              </View>

              <Text style={styles.detailLabel}>PREVIOUS RESOLUTION NOTES</Text>
              <Text style={[styles.detailVal, { color: '#666' }]}>{activeTicket.notes || 'None logged.'}</Text>
            </View>

            {/* Lifecycle transitions controls */}
            <Text style={styles.sectionHeader}>Lifecycle Actions</Text>
            <View style={styles.lifecycleRow}>
              {activeTicket.status === 'new' && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => updateTicketStatus('assigned')}>
                  <Text style={styles.actionBtnText}>Assign Ticket</Text>
                </TouchableOpacity>
              )}
              {activeTicket.status === 'assigned' && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => updateTicketStatus('in_progress')}>
                  <Text style={styles.actionBtnText}>Start Repair Process</Text>
                </TouchableOpacity>
              )}
              {activeTicket.status === 'in_progress' && (
                <View style={{ width: '100%' }}>
                  <Text style={styles.formLabel}>Resolution Details</Text>
                  <TextInput
                    style={styles.formInput}
                    value={resolutionNotes}
                    onChangeText={setResolutionNotes}
                    placeholder="Describe parts replaced, compressor checks..."
                    placeholderTextColor="#555"
                  />
                  <TouchableOpacity 
                    style={[styles.actionBtn, { marginTop: 15, backgroundColor: '#10B981' }]} 
                    onPress={() => updateTicketStatus('resolved')}
                  >
                    <Text style={styles.actionBtnText}>Mark as RESOLVED</Text>
                  </TouchableOpacity>
                </View>
              )}
              {activeTicket.status === 'resolved' && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6B7280' }]} onPress={() => updateTicketStatus('closed')}>
                  <Text style={styles.actionBtnText}>Close Ticket (Finalize)</Text>
                </TouchableOpacity>
              )}
              {activeTicket.status === 'closed' && (
                <Text style={{ color: '#555', textAlign: 'center', marginVertical: 10 }}>This complaint is closed.</Text>
              )}
            </View>

            {/* Quick link to log repair in service history */}
            <TouchableOpacity 
              style={styles.logHistoryShortcut}
              onPress={() => {
                setServiceModel(activeTicket.appliance_model);
                setServiceNotes(`Resolved complaint ticket ID: ${activeTicket.id}. Replaced component.`);
                setScreen('service_history');
              }}
            >
              <Lucide name="edit-3" size={16} color="#007DC5" style={{ marginRight: 8 }} />
              <Text style={{ color: '#007DC5', fontWeight: '700' }}>Log Repair to Service History</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* 5. EXPERT DIRECTORY (division heads) */}
      {screen === 'directory' && (
        <View style={{ flex: 1 }}>
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Lucide name="arrow-left" size={24} color="#007DC5" />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>Expert Directory</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {experts.map(expert => (
              <View key={expert.id} style={styles.expertCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.expertName}>{expert.name}</Text>
                  <View style={styles.deptBadge}>
                    <Text style={styles.deptBadgeText}>{expert.department.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.expertRole}>{expert.role_title}</Text>
                <Text style={styles.expertContact}>Email: {expert.email}</Text>
                
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity 
                    style={styles.expertActionBtn}
                    onPress={() => Linking.openURL(`tel:${expert.phone}`)}
                  >
                    <Lucide name="phone" size={14} color="#007DC5" style={{ marginRight: 6 }} />
                    <Text style={styles.expertActionBtnText}>Call Dialer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.expertActionBtn}
                    onPress={() => Linking.openURL(`mailto:${expert.email}`)}
                  >
                    <Lucide name="mail" size={14} color="#007DC5" style={{ marginRight: 6 }} />
                    <Text style={styles.expertActionBtnText}>Send Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 6. PARTS CATALOG BROWSER */}
      {screen === 'parts' && (
        <View style={{ flex: 1 }}>
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Lucide name="arrow-left" size={24} color="#007DC5" />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>Parts Inventory Catalog</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchRow}>
            <Lucide name="search" size={20} color="#555" style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              value={partsSearch}
              onChangeText={setPartsSearch}
              placeholder="Search spare parts name or number..."
              placeholderTextColor="#555"
            />
          </View>

          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.partsCategoryBar}>
            {['all', 'compressor', 'thermostat', 'fan motor', 'capacitor', 'control board'].map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, partsCategory === cat && styles.filterChipActive]}
                onPress={() => setPartsCategory(cat)}
              >
                <Text style={[styles.filterChipText, partsCategory === cat && styles.filterChipTextActive]}>
                  {cat.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {parts
              .filter(p => partsCategory === 'all' || p.category.toLowerCase() === partsCategory)
              .filter(p => partsSearch === '' || p.name.toLowerCase().includes(partsSearch.toLowerCase()) || p.part_number.toLowerCase().includes(partsSearch.toLowerCase()))
              .map(part => (
                <View key={part.id} style={styles.partCard}>
                  <Text style={styles.partCardTitle}>{part.name}</Text>
                  <Text style={styles.partCardMeta}>Part No: {part.part_number} | Type: {part.appliance_type}</Text>
                  <Text style={styles.partCardDesc}>{part.description}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: 10 }}>
                    <Text style={styles.partCardStock}>In Stock: {part.quantity_in_stock} pcs</Text>
                    <Text style={styles.partCardPrice}>Price: Rs. {part.unit_price}</Text>
                  </View>
                </View>
              ))}
          </ScrollView>
        </View>
      )}

      {/* 7. SERVICE REPAIR HISTORY LOGS */}
      {screen === 'service_history' && (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <View style={styles.subHeader}>
            <TouchableOpacity onPress={() => setScreen('home')}>
              <Lucide name="arrow-left" size={24} color="#007DC5" />
            </TouchableOpacity>
            <Text style={styles.subHeaderTitle}>Repair Logs Portal</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Create new service log form */}
            <View style={styles.formContainer}>
              <Text style={styles.sectionHeader}>Log Completed Repair</Text>
              
              <Text style={styles.formLabel}>Appliance Model</Text>
              <TextInput
                style={styles.formInput}
                value={serviceModel}
                onChangeText={setServiceModel}
                placeholder="e.g. PR-1950"
                placeholderTextColor="#555"
              />

              <Text style={styles.formLabel}>Appliance Category</Text>
              <View style={styles.row}>
                {['Refrigerator', 'AC', 'Washing Machine', 'Water Dispenser', 'Air Purifier', 'Deep Freezer', 'LED TV', 'Microwave Oven'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.filterChip, serviceCategory === cat && styles.filterChipActive]}
                    onPress={() => setServiceCategory(cat)}
                  >
                    <Text style={[styles.filterChipText, serviceCategory === cat && styles.filterChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>Repair & Resolution Notes</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                multiline
                numberOfLines={4}
                value={serviceNotes}
                onChangeText={setServiceNotes}
                placeholder="Describe diagnostic checks, resistance tests, and replaced components..."
                placeholderTextColor="#555"
              />

              {/* Photo attachments before/after */}
              <Text style={styles.formLabel}>Repair Documentation (Photos)</Text>
              <ScrollView horizontal style={{ marginVertical: 8 }}>
                {servicePhotos.map((pUri, idx) => (
                  <Image key={idx} source={{ uri: pUri }} style={styles.repairFormThumbnail} />
                ))}
                <TouchableOpacity style={styles.addPhotoBtn} onPress={pickServicePhoto}>
                  <Lucide name="plus" size={24} color="#007DC5" />
                  <Text style={{ fontSize: 10, color: '#007DC5', marginTop: 4 }}>Add Photo</Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity style={styles.submitBtn} onPress={submitServiceRecord}>
                <Text style={styles.submitBtnText}>Publish Service History Log</Text>
              </TouchableOpacity>
            </View>

            {/* List past repairs */}
            <Text style={styles.sectionHeader}>Technician Field History</Text>
            <ScrollView horizontal style={styles.partsCategoryBar}>
              {['all', 'refrigerator', 'ac', 'washing machine', 'water dispenser', 'air purifier', 'deep freezer', 'led tv', 'microwave oven'].map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, historyCategory === cat && styles.filterChipActive]}
                  onPress={() => setHistoryCategory(cat)}
                >
                  <Text style={[styles.filterChipText, historyCategory === cat && styles.filterChipTextActive]}>
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {serviceHistory
              .filter(h => historyCategory === 'all' || h.description.toLowerCase().includes(historyCategory))
              .map(record => (
                <View key={record.id} style={styles.partCard}>
                  <Text style={styles.historyCardTechnician}>Technician: {record.technician_name}</Text>
                  <Text style={styles.historyCardDate}>Logged: {record.completed_at ? record.completed_at.split('T')[0] : ''}</Text>
                  <Text style={styles.historyCardDesc}>{record.description}</Text>
                </View>
              ))}
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Simulated STT Speech recognizer Overlay Sheet */}
      {recording && (
        <View style={styles.micModalOverlay}>
          <View style={styles.micModalContent}>
            <Text style={styles.micModalTitle}>PEL Voice Recognition</Text>
            
            {/* Pulsing microphone ripple animation */}
            <View style={styles.micPulseContainer}>
              <Animated.View style={[styles.micPulseRing, { transform: [{ scale: recordingPulse }] }]} />
              <View style={styles.micBtnInner}>
                <Lucide name="mic" size={32} color="#FFF" />
              </View>
            </View>
            
            <Text style={styles.micModalSub}>Listening to your voice...</Text>
            <Text style={styles.micSelectorHeader}>Select simulated query:</Text>
            
            {mockTranscripts.map(text => (
              <TouchableOpacity
                key={text}
                style={styles.micTranscriptChip}
                onPress={() => selectVoiceTranscript(text)}
              >
                <Text style={styles.micTranscriptText}>{text}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[styles.miniBtn, { marginTop: 25, borderColor: '#EF4444' }]}
              onPress={() => setRecording(false)}
            >
              <Text style={[styles.miniBtnText, { color: '#EF4444' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0
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
    fontSize: 16,
    fontWeight: '800',
    color: '#007DC5',
    letterSpacing: 2
  },
  scrollContainer: {
    paddingBottom: 60
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#111',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16
  },
  statCard: {
    backgroundColor: '#0A0A0A',
    width: '30%',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1C1C1C',
    alignItems: 'center'
  },
  statVal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#007DC5',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  statLabel: {
    color: '#555',
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center'
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 10
  },
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginVertical: 6,
    justifyContent: 'space-between'
  },
  gridBtn: {
    backgroundColor: '#111',
    width: '30%',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1C1C1C',
    alignItems: 'center'
  },
  gridBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center'
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20
  },
  linkText: {
    fontSize: 13,
    color: '#007DC5',
    fontWeight: '600',
    marginTop: 15
  },
  techTicketCard: {
    backgroundColor: '#111',
    marginHorizontal: 20,
    marginVertical: 6,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  techTicketModel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  techTicketClient: {
    fontSize: 12,
    color: '#007DC5',
    marginTop: 4
  },
  techTicketDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 8
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800'
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A'
  },
  subHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF'
  },
  modelTabBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1C'
  },
  modelTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6
  },
  modelTabActive: {
    backgroundColor: '#007DC5'
  },
  modelTabText: {
    color: '#666',
    fontWeight: '700',
    fontSize: 13
  },
  modelTabActiveText: {
    color: '#FFF'
  },
  modelTabTextActive: {
    color: '#FFF'
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
    padding: 12,
    borderRadius: 8,
    maxWidth: '85%'
  },
  bubbleContentUser: {
    backgroundColor: '#007DC5',
    borderBottomRightRadius: 1
  },
  bubbleContentBot: {
    backgroundColor: '#111',
    borderBottomLeftRadius: 1,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  bubbleTextUser: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 18
  },
  bubbleTextBot: {
    color: '#E4E4E4',
    fontSize: 14,
    lineHeight: 18
  },
  bubbleImage: {
    width: 180,
    height: 140,
    borderRadius: 6,
    marginBottom: 8
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 8,
    marginTop: 10
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#1C1C1C'
  },
  previewThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6
  },
  inputContainer: {
    paddingHorizontal: 15,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    backgroundColor: '#0A0A0A'
  },
  capsuleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 8,
    height: 50,
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
    fontSize: 13,
    paddingHorizontal: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  capsuleSend: {
    padding: 10
  },
  filterTabBar: {
    paddingHorizontal: 15,
    marginVertical: 10
  },
  filterChip: {
    backgroundColor: '#111',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  filterChipActive: {
    backgroundColor: '#007DC5',
    borderColor: '#007DC5'
  },
  filterChipText: {
    color: '#555',
    fontSize: 11,
    fontWeight: '800'
  },
  filterChipTextActive: {
    color: '#FFF'
  },
  detailBox: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1C1C1C',
    marginBottom: 20
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#555',
    marginTop: 15,
    marginBottom: 4,
    letterSpacing: 1
  },
  detailVal: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600'
  },
  callShortcutBtn: {
    backgroundColor: '#007DC5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4
  },
  lifecycleRow: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  actionBtn: {
    backgroundColor: '#007DC5',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  },
  formContainer: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1C1C1C',
    marginBottom: 20
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    marginTop: 12,
    marginBottom: 4
  },
  formInput: {
    backgroundColor: '#0A0A0A',
    color: '#FFF',
    padding: 12,
    borderRadius: 6,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1C1C1C',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  submitBtn: {
    backgroundColor: '#007DC5',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  },
  expertCard: {
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 15,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  expertName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF'
  },
  expertRole: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  expertContact: {
    fontSize: 11,
    color: '#444',
    marginTop: 2
  },
  deptBadge: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#007DC5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  deptBadgeText: {
    color: '#007DC5',
    fontSize: 9,
    fontWeight: '800'
  },
  cardActionsRow: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
    paddingTop: 10
  },
  expertActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20
  },
  expertActionBtnText: {
    color: '#007DC5',
    fontSize: 13,
    fontWeight: '600'
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 15,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14
  },
  partsCategoryBar: {
    paddingHorizontal: 20,
    marginVertical: 5
  },
  partCard: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  partCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF'
  },
  partCardMeta: {
    fontSize: 11,
    color: '#007DC5',
    marginTop: 2
  },
  partCardDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 6
  },
  partCardStock: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700'
  },
  partCardPrice: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700'
  },
  repairFormThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 10
  },
  addPhotoBtn: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center'
  },
  historyCardTechnician: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF'
  },
  historyCardDate: {
    fontSize: 11,
    color: '#555',
    marginTop: 2
  },
  historyCardDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 6
  },
  logHistoryShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 10
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
    borderRadius: 8,
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
    borderRadius: 8,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#1C1C1C'
  },
  micTranscriptText: {
    color: '#FFF',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
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
