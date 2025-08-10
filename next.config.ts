
import type {NextConfig} from 'next';

/**
 * @type {import('next').NextConfig}
 */
const isProd = process.env.NODE_ENV === 'production'
const repoName = 'access-control' // ¡MUY IMPORTANTE! Reemplaza esto con el nombre de tu repositorio de GitHub.

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  // IMPORTANT: Set the assetPrefix and basePath to the repository name for GitHub Pages deployment
  assetPrefix: isProd ? `/${repoName}/` : '',
  basePath: isProd ? `/${repoName}` : '',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
