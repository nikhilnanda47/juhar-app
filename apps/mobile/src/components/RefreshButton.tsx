import React, { useRef, useState } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { colors } from '../theme';

interface Props {
  onRefresh: () => void | Promise<void>;
  size?: number;
}

export default function RefreshButton({ onRefresh, size = 18 }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);

  const handlePress = async () => {
    if (spinning) return;
    setSpinning(true);
    spin.setValue(0);
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 600,
        useNativeDriver: Platform.OS !== 'web',
      }),
      { iterations: 3 }
    ).start(() => {
      spin.setValue(0);
      setSpinning(false);
    });
    await onRefresh();
  };

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <TouchableOpacity onPress={handlePress} style={styles.btn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <RefreshCw size={size} color={colors.textSecondary} strokeWidth={1.5} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F4F4F1',
    justifyContent: 'center', alignItems: 'center',
  },
});
