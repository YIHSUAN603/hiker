import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WAYPOINT_META } from '@/components/waypoint-sheet';
import { Spacing } from '@/constants/theme';
import type { WaypointType } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { deletePhotos, persistPhoto } from '@/media/photos';

const TYPES = Object.keys(WAYPOINT_META) as WaypointType[];

/** The editable fields collected by the sheet and handed back on submit. */
export interface InterestPointFields {
  name: string;
  category: WaypointType;
  description: string;
  photoUris: string[];
}

export interface InterestPointSheetProps {
  initialName?: string;
  initialCategory?: WaypointType;
  initialDescription?: string;
  initialPhotoUris?: string[];
  /** Whether this is editing an existing point (shows a delete action). */
  editing?: boolean;
  onSubmit: (fields: InterestPointFields) => void;
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * Modal for creating or editing an interest point: name, category, a free-text
 * description, and photos from the camera or library. The parent mounts it only
 * while open so its fields initialize fresh from the props each time.
 *
 * Photo files are persisted to the document directory the moment they are picked
 * so previews are stable, then reconciled on exit: photos added this session but
 * discarded on cancel are deleted, and photos removed before saving are deleted
 * on submit. Deleting the whole point (its remaining photos) is the parent's job.
 */
export function InterestPointSheet({
  initialName = '',
  initialCategory = 'other',
  initialDescription = '',
  initialPhotoUris = [],
  editing = false,
  onSubmit,
  onDelete,
  onClose,
}: InterestPointSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<WaypointType>(initialCategory);
  const [description, setDescription] = useState(initialDescription);
  const [photoUris, setPhotoUris] = useState<string[]>(initialPhotoUris);
  const [busy, setBusy] = useState(false);

  const addPickedPhoto = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || result.assets.length === 0) return;
    setBusy(true);
    try {
      const persisted = await persistPhoto(result.assets[0].uri);
      setPhotoUris((prev) => [...prev, persisted]);
    } catch {
      Alert.alert(t('interestPoints.photoFailedTitle'), t('interestPoints.photoFailedMessage'));
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('interestPoints.permissionDeniedTitle'),
        t('interestPoints.cameraPermissionMessage'),
      );
      return;
    }
    await addPickedPhoto(await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.7 }));
  };

  const chooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('interestPoints.permissionDeniedTitle'),
        t('interestPoints.libraryPermissionMessage'),
      );
      return;
    }
    await addPickedPhoto(
      await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7 }),
    );
  };

  const onAddPhoto = () => {
    Alert.alert(t('interestPoints.addPhoto'), undefined, [
      { text: t('interestPoints.takePhoto'), onPress: takePhoto },
      { text: t('interestPoints.chooseFromLibrary'), onPress: chooseFromLibrary },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const removePhoto = (uri: string) => {
    setPhotoUris((prev) => prev.filter((u) => u !== uri));
  };

  const close = () => {
    // Discard files added this session that were never saved.
    deletePhotos(photoUris.filter((u) => !initialPhotoUris.includes(u)));
    onClose();
  };

  const submit = () => {
    // Files that were on the record before but the user removed are now orphans.
    deletePhotos(initialPhotoUris.filter((u) => !photoUris.includes(u)));
    onSubmit({
      name: name.trim() || t(`waypointTypes.${category}`),
      category,
      description: description.trim(),
      photoUris,
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={close} />
        <ThemedView style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <ThemedText type="subtitle" style={styles.heading}>
              {t(editing ? 'interestPoints.editTitle' : 'interestPoints.addTitle')}
            </ThemedText>

            <View style={[styles.inputBox, { backgroundColor: theme.backgroundElement }]}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('interestPoints.namePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text }]}
                autoFocus
              />
            </View>

            <View style={styles.typeRow}>
              {TYPES.map((tp) => {
                const meta = WAYPOINT_META[tp];
                const selected = tp === category;
                return (
                  <Pressable
                    key={tp}
                    onPress={() => setCategory(tp)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.typeChip,
                      { backgroundColor: selected ? meta.color : theme.backgroundElement },
                    ]}>
                    <Ionicons
                      name={meta.icon}
                      size={16}
                      color={selected ? '#ffffff' : theme.textSecondary}
                    />
                    <ThemedText
                      type="small"
                      style={{ color: selected ? '#ffffff' : theme.textSecondary }}>
                      {t(`waypointTypes.${tp}`)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View style={[styles.inputBox, styles.descriptionBox, { backgroundColor: theme.backgroundElement }]}>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t('interestPoints.descriptionPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.input, styles.descriptionInput, { color: theme.text }]}
              />
            </View>

            <View style={styles.photoRow}>
              {photoUris.map((uri) => (
                <View key={uri} style={styles.thumbWrap}>
                  <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
                  <Pressable
                    onPress={() => removePhoto(uri)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('interestPoints.removePhoto')}
                    style={styles.thumbRemove}>
                    <Ionicons name="close" size={14} color="#ffffff" />
                  </Pressable>
                </View>
              ))}
              <Pressable
                onPress={onAddPhoto}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('interestPoints.addPhoto')}
                style={[styles.addPhoto, { borderColor: theme.textSecondary, opacity: busy ? 0.5 : 1 }]}>
                <Ionicons name="camera" size={22} color={theme.textSecondary} />
              </Pressable>
            </View>

            <PrimaryButton title={t('common.save')} onPress={submit} loading={busy} />
            {editing && onDelete ? (
              <PrimaryButton title={t('interestPoints.delete')} variant="danger" onPress={onDelete} />
            ) : null}
            <Pressable onPress={close} accessibilityRole="button" style={styles.cancel}>
              <ThemedText themeColor="textSecondary">{t('common.cancel')}</ThemedText>
            </Pressable>
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const THUMB_SIZE = 72;

const styles = StyleSheet.create({
  container: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  heading: { fontSize: 22, lineHeight: 28 },
  inputBox: {
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    height: 48,
    justifyContent: 'center',
  },
  input: { fontSize: 16 },
  descriptionBox: { height: undefined, paddingVertical: Spacing.two },
  descriptionInput: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumbWrap: { width: THUMB_SIZE, height: THUMB_SIZE },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: Spacing.two },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(17,24,39,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancel: { alignItems: 'center', paddingVertical: Spacing.two },
});
