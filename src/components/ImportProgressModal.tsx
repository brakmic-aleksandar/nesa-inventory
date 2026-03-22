import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';

interface ImportProgressModalProps {
  visible: boolean;
  message: string;
  useModal?: boolean;
}

export function ImportProgressModal({
  visible,
  message,
  useModal = true,
}: ImportProgressModalProps) {
  const { colors } = useTheme();

  if (!visible) {
    return null;
  }

  const content = (
    <View style={styles.root} pointerEvents="auto">
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]} />
      <View
        style={[
          styles.dialog,
          {
            backgroundColor: colors.cardBackground,
          },
        ]}
      >
        <View style={styles.container}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
        </View>
      </View>
    </View>
  );

  if (!useModal) {
    return content;
  }

  return (
    <Modal transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  dialog: {
    width: '80%',
    maxWidth: 360,
    minHeight: 180,
    borderRadius: 16,
    justifyContent: 'center',
  },
  container: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
