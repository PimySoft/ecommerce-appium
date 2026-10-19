import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['logs/**', 'dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Specs must go through page objects (team convention): no raw driver or `$` calls.
    files: ['specs/**/*.ts'],
    languageOptions: { globals: { $: 'readonly', $$: 'readonly', driver: 'readonly', browser: 'readonly' } },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: '$', message: 'Use a page object method, not a raw selector.' },
        { name: '$$', message: 'Use a page object method, not a raw selector.' },
        { name: 'driver', message: 'Use a page object or helper, not the raw driver.' },
        { name: 'browser', message: 'Use a page object or helper, not the raw browser.' },
      ],
    },
  },
  {
    // No arbitrary sleeps (team convention): wait on a condition instead.
    files: ['**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name='pause']",
          message: 'No fixed sleeps: use waitForDisplayed / waitUntil with a timeout.',
        },
      ],
    },
  },
  {
    // Chai assertions such as `expect(x).to.be.true` are property accesses.
    files: ['specs/**/*.ts', 'api/**/*.ts'],
    rules: { '@typescript-eslint/no-unused-expressions': 'off' },
  },
  {
    // Mocha loads these through `--require` / `--reporter`, which need CommonJS.
    files: ['**/*.cjs'],
    languageOptions: { globals: { require: 'readonly', module: 'writable', process: 'readonly' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
