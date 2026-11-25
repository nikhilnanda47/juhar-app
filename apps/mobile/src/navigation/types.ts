// The screens of the app and the details each one needs when it is opened.
// With these written down, a wrong screen name or a missing detail is caught when the app is built,
// not when a customer taps the button.
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Address } from '../services/api';

export type ExploreStackParams = {
  ExploreList: undefined;
  ProductDetail: { slug: string };
};

export type CartStackParams = {
  CartView: undefined;
  SelectAddress: undefined;
  AddAddress: { address?: Address } | undefined; // with an address it edits that one
  OrderReview: { addressId: string };
  OrderSuccess: { order: any }; // the order the API just returned; the screen only reads a few fields of it
};

export type OrdersStackParams = {
  OrdersList: undefined;
  OrderDetail: { orderId: string };
};

export type AccountStackParams = {
  Profile: undefined;
  Wishlist: undefined;
  Addresses: undefined;
  AddAddress: { address?: Address } | undefined;
};

export type TabParams = {
  Home: undefined;
  Shop: NavigatorScreenParams<ExploreStackParams> | undefined;
  Cart: NavigatorScreenParams<CartStackParams> | undefined;
  Orders: NavigatorScreenParams<OrdersStackParams> | undefined;
  Account: NavigatorScreenParams<AccountStackParams> | undefined;
};
