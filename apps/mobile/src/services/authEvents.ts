// Things that depend on who is logged in (the saved items, for example) learn about a login or a
// logout from here, so they never keep showing the previous person's data.

type Listener = () => void;
const listeners = new Set<Listener>();

/** Listen for a login or logout. Returns a function that stops listening. */
export function onAuthChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Tell everything that is listening that the customer logged in or out. */
export function notifyAuthChanged(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // one broken listener must not stop the others
    }
  });
}
