import * as opentype from "opentype.js";

const fonts = new Map<string, Font>();

export function getFileHash(input: string | ArrayBuffer): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const encHex = require("crypto-js/enc-hex");
    const SHA256 = require("crypto-js/sha256");

    if (typeof input !== "string") {
      const byteArray = new Uint8Array(input);
      let hexString = "";
      byteArray.forEach((byte) => {
        hexString += byte.toString(16).padStart(2, "0");
      });
      resolve(SHA256(encHex.parse(hexString)).toString());
    } else {
      if (typeof window === "undefined") {
        const fs = require("fs") as typeof import("fs");
        try {
          const fileBuffer = fs.readFileSync(input);
          const byteArray = new Uint8Array(fileBuffer.buffer);
          let hexString = "";
          byteArray.forEach((byte) => {
            hexString += byte.toString(16).padStart(2, "0");
          });
          resolve(SHA256(encHex.parse(hexString)).toString());
        } catch (err) {
          reject(new Error(`Error reading the file: ${err}`));
        }
      } else {
        reject(
          new Error(
            "File hashing from path is not supported in the browser environment"
          )
        );
      }
    }
  });
}

export async function addFont(
  data: string | ArrayBuffer,
  hash?: string
): Promise<string> {
  let key = hash;
  if (!key) {
    key = await getFileHash(data);
  }
  if (!fonts.has(key)) {
    const font = await Font.loadAsync(data);
    fonts.set(key, font);
  }
  return key;
}

export function getFont(key: string): Font {
  if (!fonts.has(key)) {
    throw new Error("Font not loaded");
  }
  return fonts.get(key)!;
}

export function hasFont(key: string): boolean {
  return fonts.has(key);
}

export function removeFont(key: string): void {
  fonts.delete(key);
}

export function getMaxHeight(font: string | Font, fontSize: number): number {
  let _font: Font;
  if (typeof font === "string") {
    if (!fonts.get(font)) {
      throw new Error("Font not loaded");
    }
    _font = fonts.get(font)!;
  } else {
    _font = font;
  }

  const sizePath = _font.font.getPath(
    "ABCDEFGHIJKLMNOPQRSTUVWYZ",
    0,
    0,
    fontSize
  );
  let sizes = sizePath.getBoundingBox();
  let height = Math.round(Math.abs(sizes.y2 - sizes.y1));
  return height;
}

export function estimateFontSize(
  font: string | Font,
  maxHeight: number
): number {
  let _font: Font;
  if (typeof font === "string") {
    if (!fonts.get(font)) {
      throw new Error("Font not loaded");
    }
    _font = fonts.get(font)!;
  } else {
    _font = font;
  }

  let previousSize = 0;
  let currentSize = maxHeight;

  while (true) {
    const height = getMaxHeight(_font, currentSize);

    if (height === maxHeight) {
      return currentSize;
    }
    const diff = Math.abs(previousSize - currentSize);
    if (height < maxHeight) {
      currentSize += diff / 2;
    } else {
      currentSize -= diff / 2;
    }
  }
}

export function getSizeNormalizer(font: string | Font) {
  let _font: Font;
  if (typeof font === "string") {
    if (!fonts.get(font)) {
      throw new Error("Font not loaded");
    }
    _font = fonts.get(font)!;
  } else {
    _font = font;
  }

  const x1 = 8;
  const x2 = 16;
  const y1 = estimateFontSize(_font, x1);
  const y2 = estimateFontSize(_font, x2);
  const a = (y2 - y1) / (x2 - x1);
  const b = y1 - a * x1;
  return (x: number) => a * x + b;
}

type Options = {
  fontSize?: number;
  normalizeSize?: boolean;
  letterSpacing?: number;
};

export function text2matrix(
  text: string,
  font: string | Font,
  options?: Options
): number[][] {
  options = options ?? {};
  let _font: Font;
  if (typeof font === "string") {
    if (!fonts.get(font)) {
      throw new Error("Font not loaded");
    }
    _font = fonts.get(font)!;
  } else {
    _font = font;
  }

  options.normalizeSize =
    options.normalizeSize === undefined ? true : options.normalizeSize;
  options.fontSize = options.fontSize ?? 11;
  if (options.normalizeSize) {
    options.fontSize = _font.normalizeSize(options.fontSize);
  }

  const sizePath = _font.font.getPath(text, 0, 0, options.fontSize, {
    letterSpacing: options.letterSpacing,
  });
  let sizes = sizePath.getBoundingBox();
  let height = Math.round(Math.abs(sizes.y2 - sizes.y1));
  let width = Math.round(Math.abs(sizes.x2 - sizes.x1));

  let canvas;
  let ctx;
  if (typeof window === "undefined") {
    // Node.js environment
    const Canvas = require("canvas").Canvas;
    canvas = new Canvas(width, height);
    ctx = canvas.getContext("2d");
  } else {
    // Browser environment
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
  }

  const path = _font.font.getPath(text, 0, height, options.fontSize, {
    letterSpacing: options.letterSpacing,
  });
  path.draw(ctx as any);

  const imageData = ctx!.getImageData(0, 0, width, height);
  const matrix = [];

  for (let y = height - 1; y >= 0; y--) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4 + 3;
      const value = imageData.data[idx] / 255;
      row.push(value);
    }
    matrix.push(row);
  }
  return matrix;
}

export class Font {
  static async loadAsync(data: string | ArrayBuffer): Promise<Font> {
    const font = new Font(data);
    await font.waitLoading();
    return font;
  }
  static load(font: opentype.Font): Font {
    return new Font(font);
  }

  private _font?: opentype.Font;
  public get font(): opentype.Font {
    if (!this._font) {
      throw new Error("Font not loaded");
    }
    return this._font;
  }

  private sizeNormalizer: (size: number) => number = (x) => x;
  private promise: Promise<void>;
  private constructor(data: string | ArrayBuffer | opentype.Font) {
    this.promise = new Promise((resolve, reject) => {
      if (typeof data === "string") {
        opentype.load(data, (err, font) => {
          if (err || !font) {
            return reject(err);
          }
          this._font = font;
        });
      } else if (data instanceof opentype.Font) {
        this._font = data;
      } else {
        this._font = opentype.parse(data);
      }
      this.sizeNormalizer = getSizeNormalizer(this);
      resolve();
    });
  }

  normalizeSize(size: number): number {
    return this.sizeNormalizer(size);
  }

  public async waitLoading(): Promise<void> {
    return await this.promise;
  }
}
