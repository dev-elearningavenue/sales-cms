/** @type {import('next').NextConfig} */
const nextConfig = {
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  // reactStrictMode: false,

  // async headers() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       headers: [
  //         { key: 'Access-Control-Allow-Origin', value: '*' },
  //         { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
  //         { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
  //       ],
  //     },
  //   ];
  // },
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
  },
};

export default nextConfig;
