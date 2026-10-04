import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dbaslduvszwowlevuhux.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      // Agregado exprés covers (AniList, and MyAnimeList via Jikan)
      { protocol: 'https', hostname: 's4.anilist.co', pathname: '/file/**' },
      { protocol: 'https', hostname: 'cdn.myanimelist.net', pathname: '/images/**' },
    ],
  },
};

export default nextConfig;
