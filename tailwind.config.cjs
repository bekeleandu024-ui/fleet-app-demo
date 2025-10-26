const forms = require("@tailwindcss/forms");

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {},
  },
  plugins: [forms],
};

module.exports = config;
