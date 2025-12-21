import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import stylistic from '@stylistic/eslint-plugin';

export default defineConfig([
  { ignores: ['dist/**', 'node_modules/**'] },

  stylistic.configs.recommended,
  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  eslintPluginPrettierRecommended,
]);
