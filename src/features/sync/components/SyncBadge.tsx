import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@shared/theme';
import type { IconName } from '@shared/types/icon';
import type { SyncColor } from '@features/sync/types/sync.type';
import { useSync } from '@features/sync/store/sync.store';

interface BadgeStyle {
  bg: string;
  dot: string;
  icon: IconName;
}

const MAP: Record<SyncColor, BadgeStyle> = {
  green: { bg: 'rgba(46,125,50,0.25)', dot: '#7FE7C8', icon: 'cloud-done-outline' },
  yellow: { bg: 'rgba(245,127,23,0.3)', dot: '#FFD54F', icon: 'cloud-upload-outline' },
  amber: { bg: 'rgba(245,127,23,0.35)', dot: '#FFB300', icon: 'warning-outline' },
  red: { bg: 'rgba(198,40,40,0.35)', dot: '#EF9A9A', icon: 'cloud-offline-outline' },
};

interface SyncBadgeProps {
  onPress?: () => void;
}

export default function SyncBadge({ onPress }: SyncBadgeProps) {
  const { syncStatus } = useSync();
  const m = MAP[syncStatus.color] || MAP.green;
  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: m.bg }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={m.icon} size={14} color={Colors.white} />
      {syncStatus.count > 0 && (
        <View style={styles.count}>
          <Text style={styles.countText}>{syncStatus.count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  count: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  countText: { color: Colors.white, fontSize: 9, fontWeight: '800' },
});
