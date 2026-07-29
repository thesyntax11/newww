import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./skills/**/*.md"],
  theme: {
    extend: {
      colors: {
        void: "#0A0B10",
        panel: "#12141C",
        "panel-soft": "#181B26",
        line: "#242737",
        plasma: {
          DEFAULT: "#9D5CFF",
          soft: "#C4A3FF",
          dim: "#5B3B94"
        },
        signal: {
          DEFAULT: "#FFB454",
          soft: "#FFD8A8"
        },
        mist: "#9BA1B4",
        chalk: "#EDEEF3"
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      backgroundImage: {
        "radial-glow":
          "radial-gradient(600px circle at var(--x,50%) var(--y,20%), rgba(157,92,255,0.18), transparent 60%)",
        "grain": "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGZpbHRlciBpZD0nbicgeD0nMCcgeT0nMCc+PGZlVHVyYnVsZW5jZSB0eXBlPSdmcmFjdGFsTm9pc2UnIGJhc2VGcmVxdWVuY3k9JzAuOScgbnVtT2N0YXZlcz0nMicgc3RpdGNoVGlsZXM9J3N0aXRjaCcvPjxmZUNvbG9yTWF0cml4IHR5cGU9J3NhdHVyYXRlJyB2YWx1ZXM9JzAnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWx0ZXI9J3VybCgjbiknIG9wYWNpdHk9JzAuMDUnLz48L3N2Zz4=')"
      },
      boxShadow: {
        glass: "0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        glow: "0 0 60px rgba(157,92,255,0.25)"
      },
      borderRadius: {
        xl2: "1.25rem"
      },
      keyframes: {
        drift: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        },
        pulseline: {
          "0%,100%": { opacity: "0.3" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        drift: "drift 6s ease-in-out infinite",
        pulseline: "pulseline 2.4s ease-in-out infinite"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};

export default config;
