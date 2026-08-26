/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1440px", // Snapped to maximum locked content width
      },
    },
    extend: {
      colors: {
        // CSS variable–driven colors: automatically switch with .dark class
        primary: {
          DEFAULT: "var(--primary)",
          focus: "var(--primary-focus)",
          dark: "var(--primary-on-dark)",
          foreground: "#ffffff",
        },
        ink: {
          DEFAULT: "var(--ink)",
          muted80: "rgba(128,128,128,0.80)",
          muted48: "rgba(128,128,128,0.48)",
          muted32: "rgba(128,128,128,0.32)",
          muted8: "rgba(128,128,128,0.08)",
        },
        canvas: {
          DEFAULT: "var(--canvas)",
          parchment: "var(--canvas-parchment)",
        },
        surface: {
          pearl: "var(--surface-pearl)",
          tile1: "var(--surface-tile-1)",
          tile2: "var(--surface-tile-2)",
          tile3: "var(--surface-tile-3)",
          black: "#000000",
          chip: "rgba(128, 128, 135, 0.18)",
        },
        hairline: "var(--hairline)",
        "divider-soft": "var(--hairline)",

        // Shadcn UI compatibility mapping
        border: "var(--hairline)",
        input: "var(--canvas)",
        ring: "var(--primary-focus)",
        background: "var(--canvas)",
        foreground: "var(--ink)",
        card: {
          DEFAULT: "var(--canvas)",
          foreground: "var(--ink)",
        },
        muted: {
          DEFAULT: "var(--canvas-parchment)",
          foreground: "rgba(128,128,128,0.48)",
        },
      },
      spacing: {
        // Apple Design Spec spacing
        xxs: "4px",
        xs: "8px",
        sm: "12px",
        md: "17px",
        lg: "24px",
        xl: "32px",
        xxl: "48px",
        section: "80px",
      },
      borderRadius: {
        // Apple Design Spec rounding
        none: "0px",
        xs: "5px",
        sm: "8px",
        md: "11px",
        lg: "18px",
        pill: "9999px",
      },
      fontFamily: {
        // SF Pro fonts falling back to Inter per substitute guidelines
        display: ["SF Pro Display", "Inter", "system-ui", "-apple-system", "sans-serif"],
        text: ["SF Pro Text", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      letterSpacing: {
        "apple-tight": "-0.022em", // approx -0.374px for body/tagline
        "apple-hero": "-0.01em",    // approx -0.28px for hero
      },
      boxShadow: {
        // Single product image shadow - ONLY shadow in the system
        "product-surface": "rgba(0, 0, 0, 0.22) 3px 5px 30px 0px",
      },
    },
  },
  plugins: [],
}
