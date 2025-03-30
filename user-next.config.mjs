/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable CORS for API routes
  async headers() {
    return [
      {
        // Match all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
      {
        // Add caching for static assets
        source: "/:path*.(jpg|jpeg|gif|png|svg|ico|webp)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Add caching for static JS/CSS files
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.my.id',
        pathname: '**',
      },
    ],
  },
  // Add helpful comments in HTML output
  experimental: {
    // This adds helpful HTML comments for debugging
    optimizePackageImports: ['lucide-react'],
  },
  // Disable source maps in production to improve performance
  productionBrowserSourceMaps: process.env.NODE_ENV !== 'production',
  
  // Fix for cross-origin request warning
  // Add allowed development origins for local development
  // This allows requests from other origins during development
  experimental: {
    allowedDevOrigins: ['localhost', '127.0.0.1', '.ngrok.io', '.vercel.app'],
  },
}

export default nextConfig

