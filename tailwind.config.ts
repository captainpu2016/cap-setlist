import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        stage: {
          950: '#0c0a09',
          900: '#151211',
          800: '#211c1a',
          700: '#332a26'
        },
        marquee: {
          DEFAULT: '#f4b93c',
          soft: '#f7d488'
        },
        signal: {
          DEFAULT: '#e0523a'
        },
        paper: '#f4efe6'
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif']
      },
      backgroundImage: {
        grain: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")"
      }
    }
  },
  plugins: []
};

export default config;
