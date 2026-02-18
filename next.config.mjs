/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    // Geen filesystem-cache in dev: voorkomt "hasStartTime" en "Serializing big strings" waarschuwingen
    if (dev) {
      config.cache = false
    }
    return config
  },
}

export default nextConfig
