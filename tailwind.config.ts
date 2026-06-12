import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        muted: "#667085",
        line: "#d8dee7",
        brand: "#126d5b",
        brandDark: "#0e5749",
        danger: "#b42318",
        warning: "#9a6700"
      }
    }
  },
  plugins: []
};

export default config;
