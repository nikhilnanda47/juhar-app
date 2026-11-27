import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadLocalEnv } from './load-env';

describe('loadLocalEnv', () => {
  const dir = mkdtempSync(join(tmpdir(), 'env-'));
  afterEach(() => {
    delete process.env.LOAD_ENV_TEST_A;
    delete process.env.LOAD_ENV_TEST_B;
  });

  it('reads the file into the environment', () => {
    const file = join(dir, 'a.env');
    writeFileSync(file, 'LOAD_ENV_TEST_A="from file"\n');
    expect(loadLocalEnv(file)).toBe(true);
    expect(process.env.LOAD_ENV_TEST_A).toBe('from file');
  });

  it('never overrides a variable that is already set', () => {
    const file = join(dir, 'b.env');
    writeFileSync(file, 'LOAD_ENV_TEST_B=file\n');
    process.env.LOAD_ENV_TEST_B = 'shell';
    loadLocalEnv(file);
    expect(process.env.LOAD_ENV_TEST_B).toBe('shell');
  });

  it('does nothing when there is no file', () => {
    expect(loadLocalEnv(join(dir, 'missing.env'))).toBe(false);
  });
});
