import { resolve } from 'node:path'
import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'
import { name } from './package.json'

export default defineConfig(({ mode }) => {
  const base = mode === 'npm' ? '' : '/'
  return {
    base,
    plugins: [react()],
    build: {
      target: 'es2019',
      cssTarget: 'chrome80',
      sourcemap: false,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name,
        fileName: 'index',
        formats: ['es']
      },
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          'katex',
          'katex/contrib/mhchem',
          'mermaid',
          'stream-monaco',
          'stream-markdown',
          'stream-markdown-parser',
          '@floating-ui/dom'
        ]
      }
    }
  }
})
