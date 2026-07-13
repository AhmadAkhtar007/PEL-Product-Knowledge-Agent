import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather as Lucide } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function SettingsScreen({ onBack }) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.subHeader}>
        <TouchableOpacity onPress={onBack}>
          <Lucide name="arrow-left" size={24} color={theme.colors.accentIcon} />
        </TouchableOpacity>
        <Text style={styles.subHeaderTitle}>Profile & Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.profileBox}>
        <View style={styles.avatar}>
          <Lucide name="user" size={40} color={theme.colors.textSecondary} />
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
          <Text style={styles.settingLabel}>Theme</Text>
          <TouchableOpacity style={styles.themeToggleBtn} onPress={theme.toggleTheme}>
            <Text style={styles.themeToggleText}>{theme.isDark ? 'Dark Mode' : 'Light Mode'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.bgApp,
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault
  },
  subHeaderTitle: {
    color: theme.colors.textPrimary,
    ...theme.typography.title,
  },
  profileBox: {
    alignItems: 'center',
    marginVertical: 30
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceSunken,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.accentIcon
  },
  profileName: {
    color: theme.colors.textPrimary,
    ...theme.typography.title,
    marginTop: theme.spacing.md
  },
  profileEmail: {
    color: theme.colors.textSecondary,
    ...theme.typography.body,
    marginTop: theme.spacing.xs
  },
  settingsSection: {
    backgroundColor: theme.colors.surfaceCard,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    // Add border for dark mode, shadow for light mode based on elevation logic from Design.md
    borderWidth: 1,
    borderColor: theme.colors.borderDefault
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderDefault
  },
  settingLabel: {
    color: theme.colors.textPrimary,
    ...theme.typography.body
  },
  settingValue: {
    color: theme.colors.textSecondary,
    ...theme.typography.body
  },
  themeToggleBtn: {
    backgroundColor: theme.colors.surfaceSunken,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderDefault
  },
  themeToggleText: {
    color: theme.colors.textPrimary,
    ...theme.typography.caption
  }
});
