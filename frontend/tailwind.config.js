/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "brand-yellow": "#ffe600",
        "brand-cyan": "#00e5ff",
        "brand-pink": "#ff0055",
        "brand-ink": "#09090b",
        "brand-mute": "#a1a1a1",
      },
      boxShadow: {
        "comic": "4px 4px 0px #000",
        "comic-line": "2px 2px 0px #000",
        "comic-yellow": "4px 4px 0px #ffe600",
      },
      fontFamily: {
        display: ["Bebas Neue", "Impact", "sans-serif"],
      },
    },
  },
  plugins: [],
};
