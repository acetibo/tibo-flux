/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/views/**/*.pug',
    './public/**/*.html'
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['Fira Code', 'Cascadia Code', 'JetBrains Mono', 'Consolas', 'monospace']
      }
    }
  },
  plugins: []
};
