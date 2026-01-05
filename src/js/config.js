tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#136dec",
                "background-light": "#f6f7f8",
                "background-dark": "#101822",
                "surface-dark": "#1e293b",
                "surface-border": "#334155",
                // Merged difficulty colors from fixture analysis
                "difficulty-1": "#00ff87",
                "difficulty-2": "#00c090",
                "difficulty-3": "#e7e7e7",
                "difficulty-4": "#ffad0f",
                "difficulty-5": "#ff3b3b",
            },
            fontFamily: {
                "display": ["Lexend", "sans-serif"],
                "body": ["Noto Sans", "sans-serif"]
            },
            borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" },
        },
    },
}