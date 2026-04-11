import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // JairoApp Branding - Verde y Naranja
                primary: {
                    DEFAULT: "#1B7F3C", // Verde principal
                    50: "#E8F5EC",
                    100: "#D1EBD9",
                    200: "#A3D7B4",
                    300: "#75C38E",
                    400: "#47AF69",
                    500: "#1B7F3C",
                    600: "#166633",
                    700: "#114D26",
                    800: "#0B331A",
                    900: "#061A0D",
                },
                secondary: {
                    DEFAULT: "#F7931E", // Naranja/Dorado
                    50: "#FEF5E6",
                    100: "#FDEBCD",
                    200: "#FBD79B",
                    300: "#F9C369",
                    400: "#F7AF37",
                    500: "#F7931E",
                    600: "#D67A0A",
                    700: "#A35D08",
                    800: "#704005",
                    900: "#3D2303",
                },
                accent: {
                    DEFAULT: "#FF6B00", // Naranja brillante
                    light: "#FF8C33",
                    dark: "#CC5500",
                },
                success: "#22C55E",
                warning: "#F59E0B",
                error: "#EF4444",
                background: {
                    DEFAULT: "#FAFBFC",
                    dark: "#0F1419",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            animation: {
                "fade-in": "fadeIn 0.5s ease-out",
                "slide-up": "slideUp 0.5s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "bounce-slow": "bounce 2s infinite",
                "gradient": "gradient 3s ease infinite",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { transform: "translateY(20px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                gradient: {
                    "0%, 100%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                },
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "jairo-gradient": "linear-gradient(135deg, #1B7F3C 0%, #166633 50%, #F7931E 100%)",
                "hero-pattern": "linear-gradient(135deg, #1B7F3C 0%, #0F5A2A 100%)",
            },
            boxShadow: {
                "glow": "0 0 20px rgba(27, 127, 60, 0.3)",
                "glow-orange": "0 0 20px rgba(247, 147, 30, 0.3)",
            },
        },
    },
    plugins: [],
};

export default config;
