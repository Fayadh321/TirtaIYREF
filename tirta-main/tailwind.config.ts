import type { Config } from "tailwindcss";

const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3b82f6",
          50: "#eef6ff",
          100: "#dbeafe",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
    },
  },
} satisfies Config;

export default config;
