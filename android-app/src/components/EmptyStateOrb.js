import React, { useEffect, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function EmptyStateOrb() {
  const theme = useTheme();
  const [pulse] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.15,
          duration: 1500,
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true
        })
      ])
    ).start();
  }, [pulse]);

  const styles = getStyles(theme);

  return (
    <View style={styles.emptyChatBox}>
      <Animated.View style={[styles.emptyOrb, { transform: [{ scale: pulse }] }]}>
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
  );
}

const getStyles = (theme) => StyleSheet.create({
  emptyChatBox: {
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyOrb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.brandPrimarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    // elevation.focusGlow logic for glowing effect
    shadowColor: theme.colors.accentIcon,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8, // fallback for android
    // We can also add border if needed, but shadow implements focusGlow from Design.md
  },
  pelLogoOuter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accentIcon,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pelLogoInner: {
    width: 50,
    height: 34,
    borderRadius: 25,
    backgroundColor: theme.colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pelLogoText: {
    color: theme.colors.accentIcon,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  emptyChatTitle: {
    color: theme.colors.textPrimary,
    ...theme.typography.title,
    marginBottom: theme.spacing.sm
  },
  emptyChatDesc: {
    color: theme.colors.textSecondary,
    ...theme.typography.body,
    textAlign: 'center',
    paddingHorizontal: 30
  }
});
