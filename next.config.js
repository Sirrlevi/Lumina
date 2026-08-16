/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // MediaPipe Face Mesh is a browser-only dependency. The app never imports
    // ONNX Runtime server-side; keeping the client bundle isolated avoids
    // stale/irrelevant native ORT artifacts being parsed during Vercel builds.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'onnxruntime-node': false,
    };
    return config;
  },
};

module.exports = nextConfig;
