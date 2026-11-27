import React, { useMemo } from 'react';
import { InputAccessoryView, Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme, type ColorPalette, spacing } from '../theme';

// The iPhone number keypad has no Return or Done key, so once it is open nothing on it closes it (and it covers the
// tab bar). Give a number field `inputAccessoryViewID={DONE_BAR_ID}` and render <KeyboardDoneBar /> on the screen:
// a "Done" bar then sits on top of the keypad. It exists only on iPhone; elsewhere it renders nothing.
export const DONE_BAR_ID = 'juhar-keyboard-done';

export default function KeyboardDoneBar() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={DONE_BAR_ID}>
      <View style={styles.bar}>
        <TouchableOpacity onPress={Keyboard.dismiss} accessibilityRole="button" accessibilityLabel="Hide keyboard" hitSlop={12}>
          <Text style={styles.done}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const createStyles = (colors: ColorPalette) => StyleSheet.create({
  bar: {
    flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.margin, paddingVertical: 10,
    backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  done: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.primary },
});
