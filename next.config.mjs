/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'images.unsplash.com',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: 'another-image-source.com',
          pathname: '/**',
        },
      ], // Add external domains here
    },
  };
  
  export default nextConfig; // Use export default for ES modules
  