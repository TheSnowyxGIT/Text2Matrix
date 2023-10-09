# Text2Matrix

## Introduction

Convert text strings into customizable pixel matrices with options for max height, letter spacing, and more. Ideal for LED displays and creative typographic applications.

## Installation

```bash
npm install text2matrix
```

## Usage

```javascript
const text2matrix = require("text2matrix");

async function main() {
  const text = "Hello World!";
  const myFont = "myFont.ttf";
  await text2matrix.addFont(myFont);
  const matrix = text2matrix.text2matrix(text, myFont, {
    maxHeight: 10,
    letterSpacing: 1,
  });
}
```
