import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert,
} from 'react-native';
import { Check, Truck, MessageSquare, ShieldCheck, ArrowRight, Copy } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../theme';
import { formatPaise } from '../services/api';
import { BounceIn, FadeInUp } from '../components/AnimatedUI';

interface Props {
  navigation: any;
  route: { params: { order: any } };
}

export default function OrderSuccessScreen({ navigation, route }: Props) {
  const { order } = route.params;
  const firstItem = order.items?.[0];

  const handleCopy = () => {
    Alert.alert('Order Number', order.publicNumber);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={{ height: 40 }} />

      <View style={styles.centerContent}>
        {/* Checkmark */}
        <BounceIn delay={200}>
          <View style={styles.checkCircle}>
            <Check size={32} color="#3D8B63" strokeWidth={2.5} />
          </View>
        </BounceIn>

        {/* Headline */}
        <FadeInUp delay={400} duration={500}>
          <Text style={styles.title}>Order placed!</Text>
          <Text style={styles.subtitle}>Thank you for championing indigenous handloom craft.</Text>
        </FadeInUp>

        {/* Order Reference */}
        <FadeInUp delay={600} duration={400}>
        <TouchableOpacity style={styles.refBadge} onPress={handleCopy}>
          <Text style={styles.refLabel}>REF:</Text>
          <Text style={styles.refNumber}>{order.publicNumber}</Text>
          <Copy size={16} color={colors.primary} strokeWidth={2} />
        </TouchableOpacity>
        </FadeInUp>

        {/* Order Preview Card */}
        <FadeInUp delay={700} duration={500}>
        <View style={styles.previewCard}>
          <View style={styles.previewTop}>
            <View style={styles.previewThumb} />
            <View style={styles.previewInfo}>
              <Text style={styles.previewLabel}>MASTERPIECE RESERVED</Text>
              <Text style={styles.previewName} numberOfLines={1}>
                {firstItem?.productTitle || 'Handloom Saree'}
              </Text>
              <Text style={styles.previewMeta}>
                {firstItem?.variantName || 'Sambalpuri Cluster'}
              </Text>
            </View>
          </View>

          <View style={styles.previewDivider} />

          <View style={styles.deliveryInfo}>
            <View>
              <Text style={styles.deliveryLabel}>Estimated delivery</Text>
              <Text style={styles.deliveryDate}>22–26 Nov 2026</Text>
            </View>
            <Truck size={20} color={colors.accent} strokeWidth={1.5} />
          </View>

          <View style={styles.smsRow}>
            <MessageSquare size={16} color={colors.textSecondary} strokeWidth={1.5} />
            <Text style={styles.smsText}>
              Updates sent to <Text style={styles.smsPhone}>{order.addressSnapshot?.recipientPhone || '+91 XXXXXXXXXX'}</Text>
            </Text>
          </View>
        </View>
        </FadeInUp>

        {/* Craft Assurance */}
        <FadeInUp delay={850} duration={400}>
        <View style={styles.assuranceCard}>
          <ShieldCheck size={20} color={colors.accent} strokeWidth={1.5} />
          <View style={{ flex: 1 }}>
            <Text style={styles.assuranceTitle}>Sacred Care & Authenticity</Text>
            <Text style={styles.assuranceSub}>
              Handpacked in unbleached kora cloth with GI weaver provenance certificate.
            </Text>
          </View>
        </View>
        </FadeInUp>

        {/* Actions */}
        <FadeInUp delay={1000} duration={400}>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              navigation.navigate('Orders', {
                screen: 'OrderDetail',
                params: { orderId: order.id },
              });
            }}
          >
            <Text style={styles.primaryBtnText}>View Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.ghostBtnText}>Continue Shopping</Text>
            <ArrowRight size={18} color={colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        </FadeInUp>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.margin, paddingBottom: spacing.xl },
  centerContent: { alignItems: 'center', maxWidth: 400, alignSelf: 'center', width: '100%' },

  // Checkmark
  checkCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(61,139,99,0.1)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },

  // Text
  title: {
    fontFamily: 'NotoSerif-Regular', fontSize: 22, lineHeight: 28,
    color: colors.textPrimary, marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular', fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', marginBottom: spacing.md,
  },

  // Order Ref
  refBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EEEEEB', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: borderRadius.full, marginBottom: spacing.xl,
  },
  refLabel: {
    fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.textSecondary,
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  refNumber: {
    fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.primary,
    letterSpacing: -0.2,
  },

  // Preview Card
  previewCard: {
    width: '100%', backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  previewTop: { flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  previewThumb: { width: 56, height: 72, borderRadius: 8, backgroundColor: '#E0DDD8' },
  previewInfo: { flex: 1, justifyContent: 'center' },
  previewLabel: {
    fontFamily: 'DMSans-SemiBold', fontSize: 11, color: colors.accent,
    letterSpacing: 2, textTransform: 'uppercase',
  },
  previewName: { fontFamily: 'DMSans-Medium', fontSize: 14, color: colors.textPrimary, marginTop: 2 },
  previewMeta: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  previewDivider: { height: 1, backgroundColor: '#EEEEEB', marginBottom: spacing.md },
  deliveryInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  deliveryLabel: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },
  deliveryDate: { fontFamily: 'DMSans-SemiBold', fontSize: 16, color: colors.textPrimary, letterSpacing: -0.2 },
  smsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  smsText: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary },
  smsPhone: { fontFamily: 'DMSans-Medium', fontSize: 12, color: colors.textPrimary },

  // Assurance
  assuranceCard: {
    width: '100%', flexDirection: 'row', gap: 10,
    backgroundColor: '#F4F4F1', borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.xl,
  },
  assuranceTitle: { fontFamily: 'DMSans-Medium', fontSize: 13, color: colors.textPrimary, letterSpacing: 0.2 },
  assuranceSub: { fontFamily: 'DMSans-Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Actions
  actions: { width: '100%', gap: spacing.md },
  primaryBtn: {
    width: '100%', height: 48, borderRadius: 8,
    backgroundColor: '#6E2334', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  primaryBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.white },
  ghostBtn: {
    width: '100%', paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  ghostBtnText: { fontFamily: 'DMSans-SemiBold', fontSize: 14, color: colors.primary },
});
