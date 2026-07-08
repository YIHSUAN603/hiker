import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { WAYPOINT_META } from '@/components/waypoint-sheet';
import { Spacing } from '@/constants/theme';
import type { InterestPoint } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';

export interface InterestPointCardProps {
  point: InterestPoint;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * Bottom info card shown when an interest-point marker is tapped. Displays the
 * category badge, name, description, and photo thumbnails, with Edit / Delete
 * actions. Sits above the safe-area inset like the recording panel.
 */
export function InterestPointCard({ point, onEdit, onDelete, onClose }: InterestPointCardProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useTranslation();
  const meta = WAYPOINT_META[point.category];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
      ]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: meta.color }]}>
          <Ionicons name={meta.icon} size={16} color="#ffffff" />
        </View>
        <View style={styles.headerText}>
          <ThemedText numberOfLines={1} style={styles.name}>
            {point.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t(`waypointTypes.${point.category}`)}
          </ThemedText>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('interestPoints.close')}
          style={styles.close}>
          <Ionicons name="close" size={22} color={theme.textSecondary} />
        </Pressable>
      </View>

      {point.description ? (
        <ThemedText themeColor="textSecondary" style={styles.description}>
          {point.description}
        </ThemedText>
      ) : null}

      {point.photoUris.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          {point.photoUris.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.photo} contentFit="cover" />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          title={t('interestPoints.edit')}
          variant="neutral"
          onPress={onEdit}
          style={styles.flex}
        />
        <PrimaryButton
          title={t('interestPoints.delete')}
          variant="danger"
          onPress={onDelete}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const PHOTO_SIZE = 96;

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.four,
    gap: Spacing.three,
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 17, fontWeight: '600' },
  close: { padding: Spacing.one },
  description: { lineHeight: 20 },
  photos: { gap: Spacing.two },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: Spacing.two },
  actions: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});
