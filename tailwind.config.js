/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--bg) / <alpha-value>)',
        foreground: 'rgb(var(--text) / <alpha-value>)',
        card: 'rgb(var(--surface) / <alpha-value>)',
        'card-foreground': 'rgb(var(--text) / <alpha-value>)',
        popover: 'rgb(var(--surface) / <alpha-value>)',
        'popover-foreground': 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--surface-2) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-foreground': 'rgb(var(--bg) / <alpha-value>)',
        secondary: 'rgb(var(--surface-2) / <alpha-value>)',
        'secondary-foreground': 'rgb(var(--text) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--border) / <alpha-value>)',
        ring: 'rgb(var(--accent) / <alpha-value>)',
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface-2) / <alpha-value>)',
        surface3: 'rgb(var(--surface-3) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        brand: {
          50: 'rgb(var(--accent) / 0.08)',
          100: 'rgb(var(--accent) / 0.15)',
          200: 'rgb(var(--accent) / 0.3)',
          300: 'rgb(var(--accent) / 0.5)',
          400: 'rgb(var(--accent) / 0.7)',
          500: 'rgb(var(--accent) / <alpha-value>)',
          600: 'rgb(var(--accent-strong) / <alpha-value>)',
          700: 'rgb(var(--accent-strong) / 0.85)',
          800: 'rgb(var(--accent-strong) / 0.7)',
          900: 'rgb(var(--accent-strong) / 0.55)',
        },
        nano: {
          navy: {
            900: 'rgb(var(--bg) / <alpha-value>)',
            800: 'rgb(var(--surface) / <alpha-value>)',
            700: 'rgb(var(--surface-2) / <alpha-value>)',
          },
          blue: {
            400: 'rgb(var(--accent) / <alpha-value>)',
            500: 'rgb(var(--accent-strong) / <alpha-value>)',
            glow: 'rgb(var(--accent) / 0.5)',
          },
          orange: {
            400: 'rgb(var(--warning) / <alpha-value>)',
            500: 'rgb(var(--warning) / <alpha-value>)',
            glow: 'rgb(var(--warning) / 0.5)',
          },
          pink: {
            500: 'rgb(var(--accent-alt) / <alpha-value>)',
          },
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
