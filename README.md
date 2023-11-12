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
  const key = await text2matrix.addFont(myFont);
  const matrix = text2matrix.text2matrix(text, key, {
    fontSize: 10,
    normalize: true, // normalize to max height so fontSize represents max height. default true
    letterSpacing: 1,
  });
}
```
