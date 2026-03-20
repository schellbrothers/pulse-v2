/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "mc-bg": "#0a0a0f",
        "mc-surface": "#111118",
        "mc-border": "#1e1e2e",
        "mc-accent": "#76b900",
        "mc-blue": "#3b82f6",
        "mc-text": "#e2e8f0",
        "mc-muted": "#64748b",
      },
    },
  },
  plugins: [],
};
