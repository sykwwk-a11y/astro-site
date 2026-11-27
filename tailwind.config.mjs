// tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,mjs,ts,tsx}'],
    theme: {
      extend: {
        colors: {
          accent: '#846D5B',
          base: '#FFFFFF',
          text: '#1A1A1A',
          main: '#35284A',
          'main-2': '#D7D4DB',
          'accent-2': '#F7F4F2',
          'text-2': '#6B6B6B',
        },
        fontFamily: {
          sans: [
            '"Noto Sans JP"',
            '"Hiragino Sans"',
            '"Hiragino Kaku Gothic ProN"',
            'Meiryo',
            'sans-serif',
          ],
        },
        fontSize: {
          h1: ['2.625rem', { lineHeight: '1.45', fontWeight: '600' }],
          h2: ['1.75rem', { lineHeight: '1.5', fontWeight: '600' }],
          h3: ['1.375rem', { lineHeight: '1.55', fontWeight: '500' }],
          body: ['1.125rem', { lineHeight: '1.75', fontWeight: '400' }],
          subheader: ['1.25rem', { lineHeight: '1.6', fontWeight: '500' }],
          button: ['1.25rem', { lineHeight: '1.6', fontWeight: '500' }],
          caption: ['0.75rem', { lineHeight: '1.6', fontWeight: '400' }],
        },
        keyframes: {
          marquee: {
            from: { transform: 'translateX(0)' },
            to: { transform: 'translateX(-50%)' },
          },
        },
        animation: {
          marquee: 'marquee linear infinite',
        },
      },
    },
    plugins: [require('daisyui')({ themes: ['light --default'] })],
  };