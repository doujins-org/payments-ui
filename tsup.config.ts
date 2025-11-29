import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    '@tanstack/react-query',
    '@solana/web3.js',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-base',
    '@radix-ui/react-slot',
    '@radix-ui/react-dialog',
    '@radix-ui/react-alert-dialog',
    '@radix-ui/react-checkbox',
    '@radix-ui/react-label',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-select',
    '@radix-ui/react-separator',
    '@radix-ui/react-tabs',
  ],
})
