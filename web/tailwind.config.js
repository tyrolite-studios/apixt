export default {
    content: ["./src/**/*.{html,js}"],
    theme: {
        extend: {
            colors: {
                "app-bg": "rgb(var(--app-bg))",
                app: "rgb(var(--app))",

                "primary-bg": "rgb(var(--primary-bg))",
                primary: "rgb(var(--primary))",
                "secondary-bg": "rgb(var(--secondary-bg))",
                secondary: "rgb(var(--secondary))",
                "ghost-bg": "rgb(var(--ghost-bg))",

                header: "rgb(var(--header))",
                "header-bg": "rgb(var(--header-bg))",
                "header-border": "rgb(var(--header-border))",

                button: "rgb(var(--button))",
                "button-bg": "rgb(var(--button-bg))",
                "button-border": "rgb(var(--button-border))",

                "overlay-bg": "rgb(var(--overlay-bg))",
                "block-header": "rgb(var(--block-header))",
                "block-header-bg": "rgb(var(--block-header-bg))",
                "block-header-border": "rgb(var(--block-header-border))"
            }
        }
    },
    plugins: []
}
