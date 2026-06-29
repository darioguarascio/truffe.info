/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#eef1f8',
          muted: '#949db5',
          faint: '#5e6778',
        },
        paper: {
          DEFAULT: '#060810',
          warm: '#0c1020',
          card: '#111827',
          elevated: '#161f33',
        },
        alert: {
          DEFAULT: '#ff5c5c',
          soft: 'rgba(255, 92, 92, 0.12)',
          glow: '#ff7b7b',
        },
        trust: {
          DEFAULT: '#2dd4bf',
          light: 'rgba(45, 212, 191, 0.12)',
          dark: '#14b8a6',
        },
        accent: {
          DEFAULT: '#fbbf24',
          soft: 'rgba(251, 191, 36, 0.12)',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4)',
        lift: '0 0 0 1px rgba(45,212,191,0.2), 0 16px 48px rgba(0,0,0,0.5)',
        glow: '0 0 40px rgba(45, 212, 191, 0.15)',
        'glow-alert': '0 0 40px rgba(255, 92, 92, 0.2)',
      },
      backgroundImage: {
        mesh: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(45,212,191,0.18), transparent), radial-gradient(ellipse 60% 50% at 100% 0%, rgba(255,92,92,0.12), transparent), radial-gradient(ellipse 50% 40% at 0% 100%, rgba(251,191,36,0.08), transparent)',
        grid: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        grid: '64px 64px',
      },
      animation: {
        'fade-up': 'fadeUp 0.7s ease-out forwards',
        'fade-up-delay': 'fadeUp 0.7s ease-out 0.15s forwards',
        'pulse-ring': 'pulseRing 2.8s ease-out infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.85)', opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};
