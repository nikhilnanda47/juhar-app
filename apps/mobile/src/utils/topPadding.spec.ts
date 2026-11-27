import { topPadding } from './topPadding';

describe('topPadding', () => {
  it('keeps the old gap in the browser, where there is no status bar', () => {
    expect(topPadding(56, 0)).toBe(56);
    expect(topPadding(48, 0)).toBe(48);
  });
  it('keeps the old gap on a phone whose status bar is short', () => {
    expect(topPadding(56, 24)).toBe(56); // a typical Android
  });
  it('clears the notch or Dynamic Island on an iPhone', () => {
    expect(topPadding(56, 47)).toBe(57); // iPhone 11 to 13
    expect(topPadding(56, 59)).toBe(69); // iPhone 14 Pro and newer
    expect(topPadding(48, 59)).toBe(69);
  });
});
