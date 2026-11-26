import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CircleAlert, WifiOff } from 'lucide-react-native';
import { useTheme, spacing, type ColorPalette } from '../theme';
import ErrorReference from './ErrorReference';
import type { LoadFailure } from '../services/loadFailure';

interface Props {
  failure: LoadFailure;
  /** Reload whatever the screen was loading. The button shows a spinner until it finishes. */
  onRetry: () => void | Promise<void>;
  /** An extra link under the button, like "Go back" */
  secondary?: { label: string; onPress: () => void };
}

/**
 * Shown in place of a screen's content when it could not be loaded: a friendly "You're offline" with a Try again
 * button when the phone could not reach the server, or a short "Something went wrong" (with the API's reference)
 * for any other failure.
 */
export default function LoadFailed({ failure, onRetry, secondary }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [retrying, setRetrying] = useState(false);
  const offline = failure.kind === 'offline';

  const retry = async () => {
    if (retrying) return;
    setRetrying(true);
    try { await onRetry(); } finally { setRetrying(false); }
  };

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      {offline
        ? <WifiOff size={48} color={colors.textTertiary} strokeWidth={1.5} />
        : <CircleAlert size={48} color={colors.textTertiary} strokeWidth={1.5} />}
      <Text style={styles.title}>{offline ? "You're offline" : 'Something went wrong'}</Text>
      <Text style={styles.text}>
        {offline ? 'We could not reach Juhar. Check your internet connection and try again.' : failure.message}
      </Text>
      <ErrorReference id={failure.reference} />
      <TouchableOpacity style={[styles.btn, retrying && styles.btnBusy]} onPress={retry} disabled={retrying} activeOpacity={0.8}>
        {retrying ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.btnText}>Try again</Text>}
      </TouchableOpacity>
      {secondary ? (
        <TouchableOpacity onPress={secondary.onPress}>
          <Text style={styles.link}>{secondary.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: spacing.xl, gap: 8 },
  title: { fontFamily: 'NotoSerif-Regular', fontSize: 20, color: colors.textPrimary, marginTop: spacing.md, textAlign: 'center' },
  text: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  btn: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: 6, paddingVertical: 12, paddingHorizontal: 32, minWidth: 140, alignItems: 'center' },
  btnBusy: { opacity: 0.7 },
  btnText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.white },
  link: { fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.primary, marginTop: spacing.md },
});
