/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["archiver", "pdf-parse", "mammoth", "@supabase/supabase-js"]
  }
};

export default nextConfig;
