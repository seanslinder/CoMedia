# Frontend Theme Architecture

The frontend uses CSS variables for theming, found in `styles/theme.css`. `theme.js` manages toggling between the `:root` (Dark) and `[data-theme='light']` scopes, saving preferences to `localStorage`.
