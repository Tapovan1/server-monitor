/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    PORT: '3002'
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
