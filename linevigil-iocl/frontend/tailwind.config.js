/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1e40af", // blue-800
        secondary: "#3b82f6", // blue-500
        danger: "#ef4444", // red-500
        warning: "#f59e0b", // amber-500
        success: "#10b981", // emerald-500
      }
    },
  },
  plugins: [],
}
