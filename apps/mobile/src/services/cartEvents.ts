// The cart badge learns about changes from here instead of asking the server every few seconds.
// Anything that changes the cart (server calls, the guest cart, login, logout) calls notifyCartChanged().

type Listener = () => void;
const listeners = new Set<Listener>();

/** Listen for cart changes. Returns a function that stops listening. */
export function onCartChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tell everything that is listening (the cart badge) that the cart changed. */
export function notifyCartChanged(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // one broken listener must not stop the others
    }
  });
}
