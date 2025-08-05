/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "res.cloudinary.com", // Cloudinary domain
      "oeiwnpngbnkhcismhpgs.supabase.co", // Your Supabase storage domain
      "maps.googleapis.com", // Google Maps Static API domain
    ],
  },
};

module.exports = nextConfig;
