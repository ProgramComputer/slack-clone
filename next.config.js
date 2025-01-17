/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    Object.defineProperty(config, 'devtool', {
      get() {
        return 'source-map';
      },
      set() {},
    });
    return config;
  },
}

module.exports = nextConfig
