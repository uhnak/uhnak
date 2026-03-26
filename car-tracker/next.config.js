/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.sauto.cz" },
      { protocol: "https", hostname: "**.autobazar.eu" },
      { protocol: "https", hostname: "**.seznam.cz" },
    ],
  },
};

module.exports = nextConfig;
