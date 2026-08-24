/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
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
  plugins: [],
}

