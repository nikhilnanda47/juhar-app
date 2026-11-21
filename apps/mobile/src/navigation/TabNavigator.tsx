// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Search, ShoppingBag, Package, User } from 'lucide-react-native';
import { useTheme, type ColorPalette, spacing, elevation } from '../theme';
import { loadToken, getCart } from '../services/api';
import { getLocalCart, localCartToResponse } from '../services/localCart';
import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import SelectAddressScreen from '../screens/SelectAddressScreen';
import AddAddressScreen from '../screens/AddAddressScreen';
import OrderReviewScreen from '../screens/OrderReviewScreen';
import OrderSuccessScreen from '../screens/OrderSuccessScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const ExploreStack = createNativeStackNavigator();
const CartStack = createNativeStackNavigator();
const OrdersStack = createNativeStackNavigator();

function ExploreStackScreen() {
  const { colors } = useTheme();
  return (
    <ExploreStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: { fontFamily: 'DMSans-Medium', fontWeight: '500', fontSize: 16, color: colors.textPrimary },
      headerShadowVisible: false,
      headerBackTitle: '',
    }}>
      <ExploreStack.Screen name="ExploreList" component={ExploreScreen} options={{ headerShown: false }} />
      <ExploreStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: false }} />
    </ExploreStack.Navigator>
  );
}

function CartStackScreen() {
  const { colors } = useTheme();
  return (
    <CartStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: { fontFamily: 'DMSans-Medium', fontWeight: '500', fontSize: 16, color: colors.textPrimary },
      headerShadowVisible: false,
      headerBackTitle: '',
    }}>
      <CartStack.Screen name="CartView" component={CartScreen} options={{ headerShown: false }} />
      <CartStack.Screen name="SelectAddress" component={SelectAddressScreen} options={{ headerTitle: 'Delivery Address' }} />
      <CartStack.Screen name="AddAddress" component={AddAddressScreen} options={{ headerTitle: 'Add Address' }} />
      <CartStack.Screen name="OrderReview" component={OrderReviewScreen} options={{ headerTitle: 'Order Review' }} />
      <CartStack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ headerShown: false }} />
    </CartStack.Navigator>
  );
}

function OrdersStackScreen() {
  const { colors } = useTheme();
  return (
    <OrdersStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.textPrimary,
      headerTitleStyle: { fontFamily: 'DMSans-Medium', fontWeight: '500', fontSize: 16, color: colors.textPrimary },
      headerShadowVisible: false,
      headerBackTitle: '',
    }}>
      <OrdersStack.Screen name="OrdersList" component={OrdersScreen} options={{ headerShown: false }} />
      <OrdersStack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerTitle: 'Order Details' }} />
    </OrdersStack.Navigator>
  );
}

export default function TabNavigator() {
  const { colors } = useTheme();
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    try {
      const hasToken = await loadToken();
      if (hasToken) {
        const cart = await getCart();
        setCartCount(cart.itemCount);
      } else {
        const localItems = await getLocalCart();
        const local = localCartToResponse(localItems);
        setCartCount(local.itemCount);
      }
    } catch {
      try {
        const localItems = await getLocalCart();
        const local = localCartToResponse(localItems);
        setCartCount(local.itemCount);
      } catch { setCartCount(0); }
    }
  }, []);

  useEffect(() => {
    refreshCartCount();
    const interval = setInterval(refreshCartCount, 3000);
    return () => clearInterval(interval);
  }, [refreshCartCount]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, size }) => {
          const color = focused ? colors.primary : colors.textTertiary;
          const iconSize = 22;
          const sw = focused ? 2.5 : 1.5;
          if (route.name === 'Home') return <Home size={iconSize} color={color} strokeWidth={sw} />;
          if (route.name === 'Shop') return <Search size={iconSize} color={color} strokeWidth={sw} />;
          if (route.name === 'Cart') return <ShoppingBag size={iconSize} color={color} strokeWidth={sw} />;
          if (route.name === 'Orders') return <Package size={iconSize} color={color} strokeWidth={sw} />;
          if (route.name === 'Account') return <User size={iconSize} color={color} strokeWidth={sw} />;
          return null;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 80,
          paddingBottom: 12,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'DMSans-Medium',
          fontSize: 10,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shop" component={ExploreStackScreen} />
      <Tab.Screen
        name="Cart"
        component={CartStackScreen}
        options={{
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: colors.white,
            fontFamily: 'DMSans-Bold',
            fontSize: 10,
            minWidth: 18,
            height: 18,
            lineHeight: 18,
            borderRadius: 9,
          },
        }}
      />
      <Tab.Screen name="Orders" component={OrdersStackScreen} />
      <Tab.Screen name="Account" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
