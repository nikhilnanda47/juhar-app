import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'juhar_local_wishlist';

export async function getLocalWishlist(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addLocalWishlistItem(variantId: string): Promise<void> {
  try {
    const ids = await getLocalWishlist();
    if (!ids.includes(variantId)) {
      await AsyncStorage.setItem(KEY, JSON.stringify([...ids, variantId]));
    }
  } catch {}
}

export async function removeLocalWishlistItem(variantId: string): Promise<void> {
  try {
    const ids = await getLocalWishlist();
    await AsyncStorage.setItem(KEY, JSON.stringify(ids.filter((id) => id !== variantId)));
  } catch {}
}

export async function clearLocalWishlist(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
