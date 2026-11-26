// One ESLint setup for the whole repo (API, web, admin, mobile, shared).
// Run it with `npm run lint` from the repo root. It only reads code; `npm run lint:fix` fixes what is safe to fix.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**', '**/dist/**', '**/build/**', '**/.next/**', '**/.expo/**', '**/coverage/**',
      '**/next-env.d.ts', 'apps/api/prisma/migrations/**', 'apps/*/*.config.{js,cjs,mjs}',
      'apps/mobile/babel.config.js', 'apps/mobile/metro.config.js',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.es2022 } },
    rules: {
      // `any` is used widely (API responses, request bodies). Banning it now would bury the useful findings,
      // so it is allowed for the moment; tightening it is a separate clean-up.
      '@typescript-eslint/no-explicit-any': 'off',
      // `catch {}` that deliberately ignores a failure is fine; an empty block anywhere else is not
      'no-empty': ['error', { allowEmptyCatch: true }],
      // an unused name is fine when it starts with an underscore (a deliberately ignored value)
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true,
      }],
    },
  },

  // Screens and pages: the two React rules that catch real bugs (hooks used wrongly, stale effects)
  {
    files: ['apps/web/**/*.{ts,tsx}', 'apps/admin/**/*.{ts,tsx}', 'apps/mobile/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Tests (they load modules with require() after jest.mock / resetModules)
  {
    files: ['**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}', '**/test/**'],
    languageOptions: { globals: { ...globals.jest } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // Plain Node command-line scripts (CommonJS): require() is how they load modules
  {
    files: ['**/scripts/**/*.js'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // The mobile app loads images and fonts with require('./asset.png'), which is how React Native does it
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },

  // The API is checked with type information too, for the mistakes that only types can see:
  // a promise that is not awaited (the work may fail or finish after the answer is sent)
  {
    files: ['apps/api/src/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
    },
  },
);
