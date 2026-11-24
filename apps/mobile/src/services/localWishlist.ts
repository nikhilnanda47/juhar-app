// What a guest saved, kept on this phone until they log in (the guest bag works the same way).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseGuestWishlist, type SavedEntry } from './wishlistState';

export const GUEST_WISHLIST_KEY = 'juhar_local_wishlist';

export async function getLocalWishlist(): Promise<SavedEntry[]> {
  try {
    return parseGuestWishlist(await AsyncStorage.getItem(GUEST_WISHLIST_KEY));
  } catch {
    return [];
  }
}

export async function saveLocalWishlist(list: SavedEntry[]): Promise<void> {
  try {
    if (list.length === 0) await AsyncStorage.removeItem(GUEST_WISHLIST_KEY);
    else await AsyncStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(list));
  } catch {
    // storage full or blocked: the hearts still work until the app is closed
  }
}

export async function clearLocalWishlist(): Promise<void> {
  await saveLocalWishlist([]);
}
