import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Feather as Lucide } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useTheme } from '../theme/ThemeContext';

export default function ChatBubble({
  msg,
  onImageZoom,
  playingMessageId,
  onPlaySpeech,
}) {
  const theme = useTheme();
  const isUser = msg.role === 'user';
  
  const styles = getStyles(theme);

  return (
    <View style={[styles.bubbleWrapper, isUser ? styles.bubbleUser : styles.bubbleBot]}>
      <View style={[styles.bubbleContent, isUser ? styles.bubbleContentUser : styles.bubbleContentBot]}>
        {msg.image_url && (
          <TouchableOpacity onPress={() => onImageZoom && onImageZoom(msg.image_url)}>
            <Image source={{ uri: msg.image_url }} style={styles.bubbleImage} />
          </TouchableOpacity>
        )}
        
        {/* TTS Button on Assistant response */}
        {!isUser && onPlaySpeech && (
          <View style={styles.ttsRow}>
            <TouchableOpacity
              style={styles.ttsBtn}
              onPress={() => onPlaySpeech(msg.id, msg.content)}
            >
              <Lucide 
                name={playingMessageId === msg.id ? 'stop-circle' : 'volume-2'} 
                size={16} 
                color={theme.colors.accentIcon} 
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

        {isUser ? (
          <Text style={styles.bubbleTextUser}>
            {msg.content}
          </Text>
        ) : (
          <Markdown style={styles.markdownStyles}>
            {msg.content}
          </Markdown>
        )}
      </View>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  bubbleWrapper: {
    marginVertical: theme.spacing.sm,
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
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    maxWidth: '85%'
  },
  bubbleContentUser: {
    backgroundColor: theme.colors.bubbleUserBg,
    borderBottomRightRadius: theme.radius.bubbleTail
  },
  bubbleContentBot: {
    backgroundColor: theme.colors.bubbleAssistantBg,
    borderBottomLeftRadius: theme.radius.bubbleTail,
    borderWidth: 1,
    borderColor: theme.colors.bubbleAssistantBorder
  },
  bubbleTextUser: {
    color: theme.colors.bubbleUserText,
    ...theme.typography.body
  },
  bubbleTextBot: {
    color: theme.colors.bubbleAssistantText,
    ...theme.typography.body
  },
  bubbleImage: {
    width: 200,
    height: 160,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm
  },
  ttsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
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
    backgroundColor: theme.colors.accentIcon,
    marginHorizontal: 1,
    borderRadius: 1
  },
  markdownStyles: {
    body: {
      color: theme.colors.bubbleAssistantText,
      ...theme.typography.body,
    },
    code_block: {
      backgroundColor: theme.colors.surfaceSunken,
      padding: 10,
      borderRadius: 8,
      color: theme.colors.textPrimary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      marginVertical: 5,
    },
    code_inline: {
      backgroundColor: theme.colors.surfaceSunken,
      paddingHorizontal: 4,
      borderRadius: 4,
      color: theme.colors.textPrimary,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    heading1: {
      color: theme.colors.textPrimary,
      fontWeight: 'bold',
      marginTop: 10,
      marginBottom: 5,
    },
    heading2: {
      color: theme.colors.textPrimary,
      fontWeight: 'bold',
      marginTop: 10,
      marginBottom: 5,
    },
    link: {
      color: theme.colors.actionPrimaryBg,
      textDecorationLine: 'underline',
    },
    paragraph: {
      marginTop: 2,
      marginBottom: 2,
    }
  }
});
