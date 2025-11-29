import withMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude Node.js modules from client bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        'better-sqlite3': false,
        bindings: false,
        'node-gyp-build': false,
      };
      // Use externals to completely exclude better-sqlite3 and its dependencies from client bundles
      // This prevents webpack from trying to bundle them even if imported
      const externalsList = ['better-sqlite3', 'bindings', 'node-gyp-build'];
      if (Array.isArray(config.externals)) {
        config.externals.push(...externalsList);
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = (context, request, callback) => {
          if (externalsList.includes(request)) {
            return callback(null, `commonjs ${request}`);
          }
          return originalExternals(context, request, callback);
        };
      } else {
        config.externals = [config.externals, ...externalsList].filter(Boolean);
      }
    }
    return config;
  },
}

const withMDXPlugin = withMDX({
  extension: /\.(md|mdx)$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
})

export default withMDXPlugin(nextConfig)
