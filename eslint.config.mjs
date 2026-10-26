import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: ['.next/**', '.wrangler/**', 'out/**', 'node_modules/**', 'weapon-system/**', 'graphify-out/**', 'audit-shots/**', 'public/**', 'next-env.d.ts', '*.tsbuildinfo'] },

  // Next's rules, including react-hooks (rules-of-hooks and exhaustive-deps).
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    rules: {
      // The code names deliberately unused values with a leading underscore (rest-destructuring to drop a key,
      // callback parameters that must keep their position).
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // next.config.mjs sets images.unoptimized (static export), so next/image would add nothing over <img> for the many small list icons.
      '@next/next/no-img-element': 'off',
      // Config files and the Cloudflare worker must default-export an anonymous value.
      'import/no-anonymous-default-export': 'off',
    },
  },

  {
    // These read untyped Bungie manifest and spreadsheet JSON.
    files: ['scripts/**', 'src/lib/bungie/parser.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
];

export default config;
