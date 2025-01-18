/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.devtool = 'source-map';
    
    return config;
  },
}

module.exports = nextConfig
