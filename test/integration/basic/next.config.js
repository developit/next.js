const path = require('path')
const analyze = process.env.ANALYZE ? require('@next/bundle-analyzer') : Object

module.exports = analyze({
  onDemandEntries: {
    // Make sure entries are not getting disposed.
    maxInactiveAge: 1000 * 60 * 60
  },
  experimental: {
    modern: !!process.env.MODERN,
    publicDirectory: true
  },
  webpack (config) {
    config.module.rules.push({
      test: /pages[\\/]hmr[\\/]about/,
      loader: path.join(__dirname, 'warning-loader.js')
    })

    return config
  }
})
