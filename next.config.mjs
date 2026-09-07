/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deployed as an installable PWA; manifest + icons live in /public.
  // (next-pwa/service-worker generation is intentionally left out of the MVP —
  // see docs/PHASE_2.md — but the manifest + icons already make the app installable.)
  headers: async () => [
    {
      // Microphone access must work from any route that runs calibration/practice.
      source: "/:path*",
      headers: [{ key: "Permissions-Policy", value: "microphone=(self)" }],
    },
  ],
};

export default nextConfig;
