/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // No basePath needed — custom domain (localllm-advisor.com) serves from root
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
