# Development guidelines

## General guidelines

We are using [prettier](https://www.npmjs.com/package/prettier) to format the source code. Make sure that you have the recommended prettier extension for your editor installed and configure your editor to use prettier on file save.

Use Tailwind CSS for styling but try to use the predefined theme colors whenever possible.

## Scripts

```
npm run dev
```
Runs a development version of the API extender which doesn't need a host API but is initialized using the file `dev/init.js` which is created automatically on the first run. You can simulate API responses in this file to develop your features (TBD)

```
npm run build
```
Builds the minimized files `dist/apixt.js` and `dist/apixt.css` which are used as templates for the host API