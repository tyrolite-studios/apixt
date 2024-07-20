# Development guidelines

## General guidelines

We are using [prettier](https://www.npmjs.com/package/prettier) to format the source code. Make sure that you have the recommended prettier extension for your editor installed and configure your editor to use prettier on file save.

## CSS Styling

Regarding the styling, we have the following objectives:

- A consistent look and feel within the app.
- The user can either select a theme or define one themselves.
- Switching between Dark/Light mode is only indirectly supported through the selection of a corresponding theme.

To achieve these objectives, we need as general UI components as possible that can be reused within the app. The styling should be done through a predefined set of Tailwind CSS classes. Deviations from this should only be made in exceptional cases.

### Colors

For color usage, the theme colors specified in the `web/src/index.css` file under the root should be used. Tailwind provides these colors under different prefixes. For example, the color of the constant `app-text` can be used as:
- `text-app-text` Uses the color as the text color
- `bg-app-text` Uses the color as the background color
- `border-app-text` Uses the color as the border color

The constants specify the intended use of the color, but it is legitimate to use this color for other purposes if it makes sense (for instance, in our last two examples, the text color `app-text` is used as a background or even border color).

Currently, it is not planned to have different palette values for these colors (e.g., `text-app-text-900`), but if a different tone of a color is needed, this can be achieved through the opacity modifier (e.g., `text-app-text/50`) but please use one of the predefined opacities.

Please keep in mind that tailwindcss might not recognize your classname if you build it dynamically like this
```
  const cls = [`bg-frame-${sub}-bg`]
``` 
Better write classnames without variables and push them conditionally.

Input components should follow a consistent color scheme using the defined `input-*` constants. Depending on the status, the following should occur:
- **`hover`**: A `brightness-<value>` is assigned, where the value depends on whether the current `input-bg` is light (=> `90`) or dark (=> `110`).

- **`focus`**: A Tailwind focus `ring` with the default width is applied around the focused input part. The default browser outline must also be disabled by `outline-none`. Depending on the placement of the element it can be necessary to set `ring-inset` instead of `ring`

- **`active`**: The classes `active-*` are assigned to the input element. A button is active when it is clicked. A radio element is active when selected. A checkbox is active when it is checked, etc.

- **`disabled`**: An `opacity-50` is applied to the element, and the disabled attribute is set.

Similarly, buttons, tabs, etc., should use `button-*` and exhibit the same state behavior.

### Spacing and Dimensions

TODO


## Scripts

```
npm run dev
```
Runs a development version of the API extender which doesn't need a host API but is initialized using the file `dev/init.js` which is created automatically on the first run. You can simulate API responses in this file to develop your features (TBD)

```
npm run build
```
Builds the minimized files `dist/apixt.js` and `dist/apixt.css` which are used as templates for the host API