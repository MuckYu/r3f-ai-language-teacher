// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  output: "standalone", // <-- ensures routes manifest is generated for Vercel
};

export default nextConfig;
