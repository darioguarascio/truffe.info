/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0f1729',
          muted: '#3d4f6f',
          faint: '#6b7d99',
        },
        paper: {
          DEFAULT: '#faf8f5',
          warm: '#f3efe8',
        },
        alert: {
          DEFAULT: '#c0392b',
          soft: '#fdecea',
        },
        trust: {
          DEFAULT: '#1e4d8c',
          light: '#e8f0fa',
        },
        accent: {
          DEFAULT: '#d4a017',
          soft: '#fef6e0',
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 41, 0.06), 0 8px 24px rgba(15, 23, 41, 0.08)',
        lift: '0 4px 20px rgba(15, 23, 41, 0.12)',
      },
    },
  },
  plugins: [],
};
