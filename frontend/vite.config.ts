import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy({
      // Target Android WebView 4.4+ (API 19+) and old Electron/Chromium builds
      targets: ['android >= 5', 'chrome >= 49', 'not dead'],
      // Generate both modern ES module build AND legacy SystemJS/IIFE build
      // Android WebView will use the legacy bundle via <script nomodule>
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      modernPolyfills: true,
    }),
  ],
})
