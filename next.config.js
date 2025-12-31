/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === 'development'
});

const nextConfig = {
    output: 'standalone',
    webpack: (config) => {
        // PDF.js worker configuration
        config.resolve.alias.canvas = false;
        config.resolve.alias.encoding = false;
        return config;
    },
    images: {
        domains: ['drive.google.com', 'lh3.googleusercontent.com'],
    },
};

module.exports = withPWA(nextConfig);
