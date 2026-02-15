/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                'grafico-red': '#C41E3A',
                'grafico-cyan': '#0072BB',
                'grafico-gold': '#D4AF37',
                'ink-black': '#121212',
                'aged-paper': '#F4F1EA',
            },
            fontFamily: {
                masthead: ['var(--font-masthead)', 'cursive'],
                accent: ['var(--font-accent)', 'sans-serif'],
                sans: ['Inter', 'sans-serif'],
                serif: ['var(--font-serif)', 'serif'],
            },
        },
    },
    plugins: [],
};
