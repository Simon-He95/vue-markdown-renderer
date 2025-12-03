import baseConfig from '../tailwind.config.js'

const baseContent = Array.isArray(baseConfig.content) ? baseConfig.content : []

export default {
  ...baseConfig,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    ...baseContent,
  ],
}
