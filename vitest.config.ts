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
        // AssetGate.tsx is the React component shell; useFrame cannot run in jsdom.
        // Pure logic (shouldReveal) lives in AssetGate.ts and is 100% covered there.
        '**/AssetGate.tsx',
        // WebGLFallback.tsx is simple static DOM — no logic to unit-test (spec §08 exemption).
        '**/WebGLFallback.tsx',
        // TweakPanel.tsx is the dev-only stub; module 09 fills it in.
        // Leva UI is not unit-testable (per detailed design §2.9).
        // FilmRoot excludes it from the scenes/index mock path is exempt too.
        '**/scenes/index.tsx',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
  },
});
