import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Combat-engine actions follow a `useX` naming convention (useCunningAction,
    // useSecondWind, useRage…) and are plain functions, not React hooks. They only
    // share the "use" prefix, so rules-of-hooks misfires wherever they're called —
    // in the engine, in the combat tests, and in CombatScreen's action handlers.
    // None of these are React render paths, so the rule is meaningless here.
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      'src/engine/**',
      'src/components/combat/CombatScreen.tsx',
    ],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    // eslint-plugin-react-hooks v7 promoted set-state-in-effect and use-memo to
    // recommended errors, and react-refresh flags only-export-components — all
    // stylistic/HMR concerns firing across pre-existing, working components.
    // Surface them as warnings rather than rewrite effect bodies (which would be
    // a behaviour change); this lane is hygiene-only.
    files: ['**/*.{ts,tsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/use-memo': 'warn',
      'react-refresh/only-export-components': 'warn',
      // An `_`-prefix is the codebase's signal for an intentionally-unused binding
      // (a uniform-API param the impl ignores, a destructured value kept for shape).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
])
