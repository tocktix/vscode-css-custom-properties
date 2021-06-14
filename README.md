Making working with CSS Custom Properties easier. CSS Custom Properties adds Intellisense, Definitions, and References for CSS custom properties _across_ your workspace.

## Features

Reveals custom property definitions across your workspace in the Intellisense completion items list.

![CSS Custom Properties Intellisense](https://storage.googleapis.com/tock-public-assets/screenshots/css-custom-props-intellisense.png)

---

Reveals custom property definitions across your workspace in the Definitions list.

![CSS Custom Properties Definitions](https://storage.googleapis.com/tock-public-assets/screenshots/css-custom-props-go-to-definition.png)

---

Reveals custom property references and definitions across your workspace in the References list.

![CSS Custom Properties References](https://storage.googleapis.com/tock-public-assets/screenshots/css-custom-props-go-to-references.png)

## Requirements

_none_

## Extension Settings

This extension contributes the following settings:

- `cssCustomProperties.files`: an array of files/globs to check for definitions and references eg. `["src/**/*.css", "app.css"]`
- `cssCustomProperties.languages`: an array of languages to apply to (eg. `["css"]`);

## Known Issues

- Currently only working for the CSS file type.
