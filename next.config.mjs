/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'lhisgvhzewmtscahnwus.supabase.co',
                pathname: '/storage/v1/object/public/tanda-logos/tanda-logos/**',
            },
        ],
    },
};

export default nextConfig;