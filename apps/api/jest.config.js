module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }],
  },
  // The real-database tests (DB_TESTS=1) share one database and some of them count rows over the
  // whole table (orders placed, products published, low stock), so two test files running at the
  // same moment disturb each other's counts. Run them one file at a time. Without DB_TESTS the
  // tests use a fake database and run in parallel as usual.
  ...(process.env.DB_TESTS === '1' ? { maxWorkers: 1 } : {}),
};
