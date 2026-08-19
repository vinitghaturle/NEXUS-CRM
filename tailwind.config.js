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
        // Apple Design Spec colors
        primary: {
          DEFAULT: "#0066cc",      // Action Blue
          focus: "#0071e3",        // Focus Blue
          dark: "#2997ff",         // Sky Link Blue (for dark canvases)
          foreground: "#ffffff",
        },
        ink: {
          DEFAULT: "#1d1d1f",
          muted80: "#333333",
          muted48: "#7a7a7a",
        },
        canvas: {
          DEFAULT: "#ffffff",      // Pure White
          parchment: "#f5f5f7",    // Apple off-white
        },
        surface: {
          pearl: "#fafafc",        // Pearl secondary button
          tile1: "#272729",        // Dark tile 1
          tile2: "#2a2a2c",        // Dark tile 2
          tile3: "#252527",        // Dark tile 3
          black: "#000000",        // Pure black void
          chip: "rgba(210, 210, 215, 0.64)", // Translucent gray chip
        },
        hairline: "#e0e0e0",
        "divider-soft": "#f0f0f0",

        // Shadcn UI compatibility mapping
        border: "#e0e0e0",
        input: "#ffffff",
        ring: "#0071e3",
        background: "#ffffff",
        foreground: "#1d1d1f",
        card: {
          DEFAULT: "#ffffff",
          foreground: "#1d1d1f",
        },
        muted: {
          DEFAULT: "#f5f5f7",
          foreground: "#7a7a7a",
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
