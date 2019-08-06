# carmine-private
A web color themeing tool

## Description
Carmine is a smart web themeing javascript module.
Carmine can generate a theme for any website given
a list of colors. Carmine will group all elements
based on their background color, and assign each group
of elements the most appropriate color from the list.
Carmine will also adjust the chosen colors from the list
to preserve the saturation and luminance differences in
the web page.

## Installation
Carmine requires tinycolor.js to run. Make sure to have
tiny color running when you run carmine!

## Usage

## Methods

### getElemData
Generates and stores data about the elements on the web
page.
```js
carmine.getElemData();
```

### getThemeData
Generates and stores theme data for the web page given
a color list. Requires generated elem data.
```js
carmine.getElemData();
carmine.getThemeData(["red", "yellow", "blue"]);
```

### themePage
Themes the web page given a color list from the theme data
that was generated for that color list. Requires generated
elem data and generated theme data.
```js
carmine.getElemData();
carmine.getThemeData(["red", "yellow", "blue"]);
carmine.themePage(["red", "yellow", "blue"])
```
