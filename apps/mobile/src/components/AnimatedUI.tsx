import React, { useRef } from 'react';
import {
  Animated, TouchableOpacity, ViewStyle, StyleProp,
} from 'react-native';
import { useOnMount } from '../utils/hooks';

// ─── Fade-in + slide up on mount ───
export function FadeInUp({
  delay = 0,
  duration = 500,
  distance = 16,
  style,
  children,
}: {
  delay?: number;
  duration?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useOnMount(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration, delay, useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration, delay, useNativeDriver: true,
      }),
    ]).start();
  });

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Fade-in on mount (no slide) ───
export function FadeIn({
  delay = 0,
  duration = 400,
  style,
  children,
}: {
  delay?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useOnMount(() => {
    Animated.timing(opacity, {
      toValue: 1, duration, delay, useNativeDriver: true,
    }).start();
  });

  return (
    <Animated.View style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
}

// ─── Scale-on-press wrapper ───
export function ScalePress({
  onPress,
  scale = 0.97,
  style,
  disabled,
  children,
}: {
  onPress?: () => void;
  scale?: number;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(anim, {
      toValue: scale, friction: 5, tension: 300, useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(anim, {
      toValue: 1, friction: 5, tension: 300, useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      disabled={disabled}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale: anim }] }}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Staggered list: renders children with incremental delay ───
export function StaggeredList({
  staggerMs = 80,
  baseDelay = 0,
  children,
  style,
}: {
  staggerMs?: number;
  baseDelay?: number;
  children: React.ReactNode[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View style={style}>
      {React.Children.map(children, (child, i) => (
        <FadeInUp key={i} delay={baseDelay + i * staggerMs} duration={400} distance={12}>
          {child}
        </FadeInUp>
      ))}
    </Animated.View>
  );
}

// ─── Pulse (infinite subtle scale pulse) ───
export function Pulse({
  style,
  minScale = 0.96,
  duration = 1500,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  minScale?: number;
  duration?: number;
  children: React.ReactNode;
}) {
  const anim = useRef(new Animated.Value(1)).current;

  useOnMount(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: minScale, duration: duration / 2, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: duration / 2, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  });

  return (
    <Animated.View style={[style, { transform: [{ scale: anim }] }]}>
      {children}
    </Animated.View>
  );
}

// ─── Bounce in (spring from 0 to 1 scale) ───
export function BounceIn({
  delay = 0,
  style,
  children,
}: {
  delay?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useOnMount(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  });

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>
      {children}
    </Animated.View>
  );
}
