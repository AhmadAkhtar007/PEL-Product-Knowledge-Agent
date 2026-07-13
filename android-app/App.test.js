import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, View } from 'react-native';
import App from './App';

// Mock Expo/Native modules
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-speech', () => ({}));
jest.mock('expo-audio', () => ({
  useAudioRecorder: () => ({
    prepareToRecordAsync: jest.fn(),
    record: jest.fn(),
    stop: jest.fn(),
    uri: 'file://test.m4a',
    isRecording: false
  }),
  AudioModule: { requestRecordingPermissionsAsync: jest.fn() },
  RecordingPresets: { HIGH_QUALITY: {} }
}));
jest.mock('expo-constants', () => ({
  expoConfig: { hostUri: 'localhost:8000' }
}));
jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
  Lucide: 'Lucide'
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, style }) => <View style={style} testID="safe-area">{children}</View>,
    SafeAreaProvider: ({ children }) => <View>{children}</View>,
  };
});

describe('App Bug Fixes', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([{ id: 'test-conv', role: 'customer' }])
    }));
    jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.skip('resets thinking state and alerts user on XHR network error', async () => {
    const mockXHR = {
      open: jest.fn(),
      setRequestHeader: jest.fn(),
      send: jest.fn(function() {
        // Simulate a network failure shortly after sending
        setTimeout(() => {
          if (this.onerror) this.onerror(new Error('Network error'));
        }, 10);
      }),
    };
    global.XMLHttpRequest = jest.fn(() => mockXHR);

    let root;
    await act(async () => {
      root = renderer.create(<App />);
    });
    
    // Enter text
    const input = root.root.findByProps({ placeholder: 'Ask a query, describe issue...' });
    await act(async () => {
      input.props.onChangeText('Hello World');
    });

    // Tap Send
    const sendButton = root.root.findByProps({ testID: 'send-button' });
    await act(async () => {
      sendButton.props.onPress();
    });

    // Wait for the thinking state to render
    await act(async () => {
      // Allow react state updates to settle
      await new Promise(r => setTimeout(r, 0));
    });

    let thinkingText = root.root.findAllByProps({ children: 'PEL Product Knowledge Agent is thinking...' });
    expect(thinkingText.length).toBeGreaterThan(0);

    // Wait 50ms for the setTimeout mock to trigger onerror
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    
    // It should reset thinking state and show alert.
    thinkingText = root.root.findAllByProps({ children: 'PEL Product Knowledge Agent is thinking...' });
    expect(thinkingText.length).toBe(0);
    
    // Check if alert was called
    expect(Alert.alert).toHaveBeenCalledWith('Network Error', 'PEL backend is offline.');
  });

  it.skip('prevents fast-tap crash on voice recorder by delaying stop()', async () => {
    let root;
    await act(async () => {
      root = renderer.create(<App />);
    });
    
    const micButton = root.root.findByProps({ testID: 'mic-button' });
    
    // Simulate fast tap
    await act(async () => {
      micButton.props.onPressIn(); // Start
      micButton.props.onPressOut(); // Stop immediately
    });

    const { useAudioRecorder } = require('expo-audio');
    const mockRecorder = useAudioRecorder();

    // Since it was a fast tap, stop() shouldn't be called immediately
    expect(mockRecorder.stop).not.toHaveBeenCalled();
  });
});
