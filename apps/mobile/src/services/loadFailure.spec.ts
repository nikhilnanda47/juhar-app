import { describeLoadFailure, isNetworkError } from './loadFailure';

describe('isNetworkError', () => {
  it('is true only for the error the API client raises when the server could not be reached', () => {
    expect(isNetworkError({ code: 'NETWORK_ERROR', status: 0 })).toBe(true);
    expect(isNetworkError({ code: 'RATE_LIMITED', status: 429 })).toBe(false);
    expect(isNetworkError(new Error('boom'))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe('describeLoadFailure', () => {
  it('says offline, with no message or reference, when the server was never reached', () => {
    expect(describeLoadFailure({ code: 'NETWORK_ERROR', status: 0, message: 'We could not reach the server.' }))
      .toEqual({ kind: 'offline', message: '', reference: '' });
  });

  it('says not found for a 404 and keeps the reference', () => {
    expect(describeLoadFailure({ code: 'NOT_FOUND', status: 404, message: 'Product not found', requestId: 'abc123' }))
      .toEqual({ kind: 'not_found', message: 'Product not found', reference: 'abc123' });
  });

  it('says error for anything else, keeping the API message and reference', () => {
    expect(describeLoadFailure({ code: 'X', status: 500, message: 'Server error', requestId: 'r1' }))
      .toEqual({ kind: 'error', message: 'Server error', reference: 'r1' });
  });

  it('does not show the text of an error that did not come from the API', () => {
    expect(describeLoadFailure(new TypeError("Cannot read properties of undefined (reading '0')")))
      .toEqual({ kind: 'error', message: 'Something went wrong. Please try again.', reference: '' });
  });

  it('falls back to a plain sentence when there is no message', () => {
    expect(describeLoadFailure(new Error(''))).toEqual({ kind: 'error', message: 'Something went wrong. Please try again.', reference: '' });
    expect(describeLoadFailure(undefined, 'Could not load orders.')).toEqual({ kind: 'error', message: 'Could not load orders.', reference: '' });
  });
});
