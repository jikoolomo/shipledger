/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@shipledger/schema",
    "@shipledger/crypto",
    "@shipledger/policy",
    "@shipledger/core",
    "@shipledger/db",
    "@shipledger/api"
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"]
    };
    return config;
  }
};

export default nextConfig;
