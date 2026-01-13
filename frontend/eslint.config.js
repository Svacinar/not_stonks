import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // TypeScript handles these
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // Allow explicit any in specific cases (warning not error)
      '@typescript-eslint/no-explicit-any': 'warn',

      // Consistent code style
      'prefer-const': 'error',
      'no-var': 'error',

      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // React hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.js', 'tests/'],
  }
);
