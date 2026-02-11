import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        
        // Navy & Copper Design System
        navy: {
          50: '#F0F4F8',
          100: '#D9E2EC',
          200: '#BCCCDC',
          300: '#9FB3C8',
          400: '#627D98',
          500: '#486581',
          600: '#334E68',
          700: '#1E3A5F',
          800: '#1A3354',
          900: '#0F172A',
        },
        copper: {
          50: '#FDF8F3',
          100: '#FAEDE0',
          200: '#F5D9C0',
          300: '#E8BA8F',
          400: '#D49560',
          500: '#B87333',
          600: '#A5632B',
          700: '#8B5225',
          800: '#6F421E',
          900: '#5A3618',
        },
        wwcc: {
          tan: '#847b4a',
          sage: '#719453',
          cream: '#fffde3',
          dark: '#2d2a1e',
          text: '#4a4635',
        },
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.06)',
        'strong': '0 8px 24px rgba(0, 0, 0, 0.08), 0 16px 48px rgba(0, 0, 0, 0.08)',
        'wwcc-offset': '12px 12px 0 #719453',
        'wwcc-offset-lg': '16px 16px 0 #719453',
        'wwcc-offset-tan': '12px 12px 0 #847b4a',
        'wwcc-offset-tan-lg': '16px 16px 0 #847b4a',
      },
    },
  },
  plugins: [],
};

export default config;
