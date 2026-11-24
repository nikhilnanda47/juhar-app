export {}; // keeps this file a module
import { notifyCartChanged, onCartChanged } from './cartEvents';

describe('cart events', () => {
  it('tells every listener when the cart changes', () => {
    const a = jest.fn(), b = jest.fn();
    const stopA = onCartChanged(a), stopB = onCartChanged(b);
    notifyCartChanged();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    stopA(); stopB();
  });

  it('stops telling a listener once it has stopped listening', () => {
    const a = jest.fn();
    const stop = onCartChanged(a);
    stop();
    notifyCartChanged();
    expect(a).not.toHaveBeenCalled();
  });

  it('a listener that throws does not stop the others', () => {
    const bad = jest.fn(() => { throw new Error('boom'); });
    const good = jest.fn();
    const stopBad = onCartChanged(bad), stopGood = onCartChanged(good);
    expect(() => notifyCartChanged()).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    stopBad(); stopGood();
  });

  it('does nothing when nobody is listening', () => {
    expect(() => notifyCartChanged()).not.toThrow();
  });
});
