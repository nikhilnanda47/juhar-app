import React from 'react';
import { Keyboard, Platform, TouchableWithoutFeedback } from 'react-native';

// Tapping outside a field closes the on-screen keyboard. Only on a phone: in the browser there is no on-screen keyboard,
// and there the wrapper treats a click on the field itself as "outside" and blurs it, so nothing can be typed.
export default function DismissKeyboard({ children }: { children: React.ReactElement }) {
  if (Platform.OS === 'web') return children;
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </TouchableWithoutFeedback>
  );
}
