/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        fog: '#f1f5f9',
        mint: '#14b8a6',
        ocean: '#0ea5e9',
      },
    },
  },
  plugins: [],
}
