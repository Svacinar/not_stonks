const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // TypeScript handles these
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // Allow explicit any in specific cases (warning not error)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Allow empty object types (common in Express route typing)
      '@typescript-eslint/no-empty-object-type': 'off',

      // Consistent code style
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',

      // Allow control characters in regex (used for sanitization)
      'no-control-regex': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.js', 'tests/'],
  }
);
