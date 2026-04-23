import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  compress: true,

  serverExternalPackages: ['typescript', 'sharp'],

  outputFileTracingExcludes: {
    '*': [
      './node_modules/typescript/**',
      './node_modules/@img/**',
      './node_modules/sharp/**',
    ],
  },

  images: {
    unoptimized: true,
  },

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'dayjs',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-label',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-toast',
      'react-hook-form',
      'zod',
      'class-variance-authority',
    ],
  },

  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
}

export default withNextIntl(nextConfig)
