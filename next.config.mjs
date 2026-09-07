/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      // Android insists on this exact path to verify the installed app.
      // The handler lives at a normal route because a directory beginning
      // with a dot is not something to rely on the file router for.
      { source: '/.well-known/assetlinks.json', destination: '/assetlinks' },
    ];
  },
};

export default nextConfig;
