/** @type {import('tailwindcss').Config} */
const motionTokens = require('./src/design/motion-tokens.json');
const plugin = require('tailwindcss/plugin');
const durations = Object.fromEntries(Object.entries(motionTokens.duration).map(([name, ms]) => [name, `${ms}ms`]));
const smoothOut = `cubic-bezier(${motionTokens.ease.smoothOut.join(', ')})`;
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      transitionDuration: durations,
      transitionTimingFunction: { 'smooth-out': smoothOut },
      fontFamily: {
        sans: ["Figtree", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      // Degraus de micro-texto já usados em todo o app (badges, timestamps,
      // rótulos densos) como text-[10px]/text-[11px] — nomeados aqui pra
      // sair de "valor arbitrário" pra parte real da escala tipográfica.
      // Ver DESIGN.md → Typography.
      fontSize: {
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        '2xs': ['0.6875rem', { lineHeight: '0.875rem' }], // 11px
      },
    },
  },
  plugins: [plugin(({ addBase }) => {
    addBase({ ':root': {
      ...Object.fromEntries(Object.entries(durations).map(([name, value]) => [`--motion-duration-${name}`, value])),
      '--motion-ease-smooth-out': smoothOut,
      '--motion-scale-modal': String(motionTokens.scale.modal),
      '--motion-distance-text': `${motionTokens.distance.text}px`,
    } });
  })],
}

