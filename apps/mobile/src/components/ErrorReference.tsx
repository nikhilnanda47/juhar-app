import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme';
import { useCopyToClipboard } from '../utils/useCopyToClipboard';

/**
 * A small "Reference: <id>" line under an error message, with a Copy button. The id is the one the
 * API logs as req=<id>, so a customer can read it out and support can find what happened.
 * Shows nothing when there is no reference (for example when the network was down).
 */
export default function ErrorReference({ id }: { id?: string }) {
  const { colors } = useTheme();
  const { copiedKey, copy } = useCopyToClipboard();
  const style = useMemo(() => ({
    row: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginBottom: 8, flexWrap: 'wrap' as const },
    text: { fontFamily: 'DMSans-Regular', fontSize: 11, color: colors.textTertiary },
    copy: { fontFamily: 'DMSans-Medium', fontSize: 11, color: colors.primary, textDecorationLine: 'underline' as const },
  }), [colors]);
  if (!id) return null;

  return (
    <View style={style.row}>
      <Text style={style.text} selectable>{`Reference: ${id}`}</Text>
      <TouchableOpacity onPress={() => copy('ref', id)} accessibilityLabel="Copy reference" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={style.copy}>{copiedKey === 'ref' ? 'Copied' : 'Copy'}</Text>
      </TouchableOpacity>
    </View>
  );
}
