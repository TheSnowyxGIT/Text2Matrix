# Text2Matrix

## Introduction

Convert text strings into customizable pixel matrices with options for max height, letter spacing, and more. Ideal for LED displays and creative typographic applications.

## Installation

```bash
npm install text2matrix
```

## Usage

```javascript
const { Font, Text } = require("text2matrix");

async function main() {
  const text = "Hello World!";
  const myFont = "myFont.ttf";
  const font = await Font.fromPath(myFont);
  const text = new Text(text, font, { fontSize: 16 });
  text.draw(); // only node environment, creates a png file
  const matrix = text.matrix; // returns a 2D array of grayscale values between 0 and 1
}
```
