import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: false, // explicit import, no global pollution
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['components/film/**/*.ts', 'components/film/**/*.tsx'],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/scenes/Scene*.tsx',
        '**/TweakPanel.tsx',
        '**/shaders/**',
        '**/__fixtures__/**',
        // useModeMachine is React Context DI wiring — explicitly exempt per task spec
        '**/useModeMachine.tsx',
        // types.ts is all TypeScript type declarations, no runtime code
        '**/types.ts',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
  },
});
