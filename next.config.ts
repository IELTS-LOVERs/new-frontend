import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN || "http://localhost:3001"
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
