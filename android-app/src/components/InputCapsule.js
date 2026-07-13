import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Keyboard, Platform } from 'react-native';
import { Feather as Lucide } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function InputCapsule({
  input,
  setInput,
  isRecording,
  onAttachPress,
  onMicPressIn,
  onMicPressOut,
  onSend,
}) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  
  // Design.md: send button switches to `action.primary.bg` fill only once text is entered
  const hasText = input.trim().length > 0;

  // Perfect native mimic: If keyboard is open, pad by exactly the keyboard height.
  // We don't use KeyboardAvoidingView on Android to prevent double-padding bugs.
  // Instead, the input bar natively pushes itself up.
  const paddingBottom = 15 + (keyboardHeight > 0 ? keyboardHeight : insets.bottom);

  return (
    <View style={[styles.chatInputWrapper, { paddingBottom }]} testID="input-capsule-wrapper">
      <View style={styles.capsuleBar}>
        <TouchableOpacity onPress={onAttachPress} style={styles.capsuleAction}>
          <Lucide name="camera" size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>
        
        <TextInput
          style={styles.capsuleTextInput}
          value={input}
          onChangeText={setInput}
          placeholder="Ask a query, describe issue..."
          placeholderTextColor={theme.colors.textTertiary}
        />
        
        <TouchableOpacity 
          testID="mic-button"
          onPressIn={onMicPressIn}
          onPressOut={onMicPressOut}
          style={[
            styles.capsuleAction, 
            { 
              marginRight: 5, 
              backgroundColor: isRecording ? theme.colors.statusDanger : 'transparent',
              borderRadius: 20 
            }
          ]}
        >
          <Lucide name="mic" size={20} color={isRecording ? theme.colors.textOnInverse : theme.colors.textTertiary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          testID="send-button" 
          onPress={onSend} 
          style={[
            styles.capsuleSend,
            hasText && styles.capsuleSendActive
          ]}
          disabled={!hasText && !isRecording}
        >
          <Lucide 
            name="send" 
            size={20} 
            color={hasText ? theme.colors.actionPrimaryText : theme.colors.accentIcon} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  chatInputWrapper: {
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.bgApp
  },
  capsuleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSunken,
    borderRadius: theme.radius.pill,
    height: 56,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault
  },
  capsuleAction: {
    padding: 10
  },
  capsuleTextInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    ...theme.typography.body,
    paddingHorizontal: 10
  },
  capsuleSend: {
    padding: 10,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  capsuleSendActive: {
    backgroundColor: theme.colors.actionPrimaryBg
  }
});
