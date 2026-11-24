export {}; // keeps this file a module
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined },
}));

// Logging in and out must tell the saved items (and anything else tied to the customer), and
// nothing else should: a silent token renewal is not a change of customer.
function load() {
  jest.resetModules();
  const api = require('./api') as typeof import('./api');
  const events = require('./authEvents') as typeof import('./authEvents');
  const heard = jest.fn();
  events.onAuthChanged(heard);
  return { api, heard };
}

describe('API calls announce a login change', () => {
  it('saving the tokens after a login does', async () => {
    const { api, heard } = load();
    await api.saveTokens('access', 'refresh');
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('clearing the tokens at logout does', async () => {
    const { api, heard } = load();
    await api.clearTokens();
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('loading the saved token at app start does not', async () => {
    const { api, heard } = load();
    await api.loadToken();
    expect(heard).not.toHaveBeenCalled();
  });
});
