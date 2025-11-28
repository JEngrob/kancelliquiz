import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paper backgrounds
        paper: {
          cream: '#f4efe4',
          aged: '#e8e0d0',
          dark: '#d4c9b5',
        },
        // Brown palette (Primary)
        brun: {
          lys: '#c4a574',
          mellem: '#8b6914',
          moerk: '#5c4a28',
          dyb: '#3d3222',
        },
        // Beige/Sand
        beige: {
          lys: '#d9cdb8',
          mellem: '#c4b8a0',
        },
        sand: '#b8a88a',
        kamel: '#a69070',
        // Grey-brown
        graa: {
          brun: '#7a7060',
          varm: '#6b6358',
        },
        // Olive
        oliven: {
          DEFAULT: '#5a5a40',
          mork: '#424230',
        },
        // Secondary
        navy: '#2c3e50',
        bordeaux: '#6b3a3a',
        // Ink
        ink: {
          black: '#1a1610',
          faded: '#3d3630',
          light: '#5a524a',
        },
        // Stamps/Accents
        stempel: {
          roed: '#8b4040',
          blaa: '#4a6080',
        },
        godkendt: '#4a6040',
        // Answer colors (retro muted versions)
        svar: {
          a: '#a05a5a',
          b: '#a08040',
          c: '#5a8a5a',
          d: '#5a5a8a',
        },
      },
      fontFamily: {
        bureau: ['"IBM Plex Mono"', '"Courier New"', 'monospace'],
        typewriter: ['"Special Elite"', '"Courier Prime"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        'kommunal': '4px 4px 0 #3d3222',
        'kommunal-sm': '2px 2px 0 #3d3222',
        'kommunal-inset': 'inset 2px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
};
export default config;
