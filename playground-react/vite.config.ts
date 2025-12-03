import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4174,
  },
  resolve: {
    alias: {
      'markstream-react': new URL('../packages/markstream-react/src', import.meta.url).pathname,
    },
  },
})
