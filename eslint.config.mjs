import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/.next/**',
      '**/.open-next/**',
      '**/.expo/**',
      '**/.wrangler/**',
      '**/dist/**',
      '**/node_modules/**',
      '**/next-env.d.ts',
      '**/cloudflare-env.generated.d.ts',
      'demo/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'jsx-a11y/alt-text': 'off',
    },
  },
  {
    files: ['apps/api/**/*.ts', 'scripts/**/*.{js,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['infra/cloudflare/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.worker,
        D1Database: 'readonly',
        DurableObjectNamespace: 'readonly',
        ExportedHandler: 'readonly',
        MessageBatch: 'readonly',
        Queue: 'readonly',
      },
    },
  },
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'react-hooks/set-state-in-effect': 'off',
    },
  },
);
