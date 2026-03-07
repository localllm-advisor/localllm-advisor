/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // basePath usato solo in produzione (GitHub Pages)
  ...(process.env.NODE_ENV === 'production' && {
    basePath: '/localllm-advisor',
  }),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
