/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe', // Added for completeness if needed
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Premium "Nano Banana" Palette
        nano: {
          navy: {
            900: '#0B1120', // Deepest background
            800: '#151E32', // Card background
            700: '#1E293B', // Lighter card
          },
          blue: {
            400: '#22D3EE', // Cyan/Electric
            500: '#06B6D4',
            glow: 'rgba(34, 211, 238, 0.5)',
          },
          orange: {
            400: '#FB923C',
            500: '#F97316',
            glow: 'rgba(251, 146, 60, 0.5)',
          },
          pink: {
            500: '#EC4899', // Secondary accent
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Outfit', 'Inter', 'sans-serif'], // For headings if we add Outfit
      },
    },
  },
  plugins: [],
}
