import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Off on purpose. With Partial Prefetching, pages that read cookies are kept in the browser as a
  // per-session "App Shell", so after a client saves their intake or changes a booking, going back
  // to a page they'd already seen showed the old details. Every page here is per-client and changes
  // often, so it must always come fresh from the server.
  partialPrefetching: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
