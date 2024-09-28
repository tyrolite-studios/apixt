export default {
    content: ["./src/**/*.{html,js}"],
    theme: {
        extend: {
            spacing: {
                dbx: "var(--def-button-padding-x)",
                dby: "var(--def-button-padding-y)",
                dix: "var(--def-input-padding-x)",
                diy: "var(--def-input-padding-y)"
            },
            colors: {
                "app-text": "rgb(var(--app-text) / <alpha-value>)",
                "app-bg": "rgb(var(--app-bg) / <alpha-value>)",

                "header-text": "rgb(var(--header-text) / <alpha-value>)",
                "header-bg": "rgb(var(--header-bg) / <alpha-value>)",
                "header-border": "rgb(var(--header-border) / <alpha-value>)",

                "frame-odd-text": "rgb(var(--frame-odd-text) / <alpha-value>)",
                "frame-odd-bg": "rgb(var(--frame-odd-bg) / <alpha-value>)",
                "frame-even-text":
                    "rgb(var(--frame-even-text) / <alpha-value>)",
                "frame-even-bg": "rgb(var(--frame-even-bg) / <alpha-value>)",
                "frame-even-border":
                    "rgb(var(--frame-even-border) / <alpha-value>)",
                "frame-odd-border":
                    "rgb(var(--frame-odd-border) / <alpha-value>)",

                "block-text": "rgb(var(--block-text) / <alpha-value>)",
                "block-bg": "rgb(var(--block-bg) / <alpha-value>)",
                "block-border": "rgb(var(--block-border) / <alpha-value>)",
                "block-header-text":
                    "rgb(var(--block-header-text) / <alpha-value>)",
                "block-header-bg":
                    "rgb(var(--block-header-bg) / <alpha-value>)",
                "block-footer-text":
                    "rgb(var(--block-footer-text) / <alpha-value>)",
                "block-footer-bg":
                    "rgb(var(--block-footer-bg) / <alpha-value>)",

                "button-text": "rgb(var(--button-text) / <alpha-value>)",
                "button-bg": "rgb(var(--button-bg) / <alpha-value>)",
                "button-border": "rgb(var(--button-border) / <alpha-value>)",

                "input-text": "rgb(var(--input-text) / <alpha-value>)",
                "input-bg": "rgb(var(--input-bg) / <alpha-value>)",
                "input-bover-bg": "rgb(var(--input-hover-bg) / <alpha-value>)",
                "input-border": "rgb(var(--input-border) / <alpha-value>)",

                "active-text": "rgb(var(--active-text) / <alpha-value>)",
                "active-bg": "rgb(var(--active-bg) / <alpha-value>)",
                "active-border": "rgb(var(--active-border) / <alpha-value>)",
                "ok-text": "rgb(var(--ok-text) / <alpha-value>)",
                "ok-bg": "rgb(var(--ok-bg) / <alpha-value>)",
                "warning-text": "rgb(var(--warning-text) / <alpha-value>)",
                "warning-bg": "rgb(var(--warning-bg) / <alpha-value>)",
                "focus-border": "rgb(var(--focus-border) / <alpha-value>)",

                "overlay-bg": "rgb(var(--overlay-bg) / <alpha-value>)"
            }
        }
    },
    plugins: []
}
