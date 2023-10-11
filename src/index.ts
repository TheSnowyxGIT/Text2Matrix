import * as opentype from "opentype.js";
import * as SHA256 from "crypto-js/sha256";
import * as encHex from "crypto-js/enc-hex";

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
    const font = new Font(data);
    await font.waitLoading();
    fonts.set(key, font);
  }
  return key;
}

export function hasFont(key: string): boolean {
  return fonts.has(key);
}

export function removeFont(key: string): void {
  fonts.delete(key);
}

type Options = {
  fontSize?: number;
  maxHeight?: number;
  letterSpacing?: number;
};

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
    const sizePath = _font.font.getPath(
      "ABCDEFGHIJKLMNOPQRSTUVWYZ",
      0,
      0,
      currentSize
    );
    let sizes = sizePath.getBoundingBox();
    let height = Math.round(Math.abs(sizes.y2 - sizes.y1));
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

  if (options.maxHeight && options.fontSize) {
    throw new Error("Can't set both maxHeight and fontSize");
  }
  if (!options.maxHeight) {
    options.fontSize = options.fontSize ?? 20;
  } else {
    options.fontSize = estimateFontSize(_font, options.maxHeight);
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
  private _font?: opentype.Font;

  public get font(): opentype.Font {
    if (!this._font) {
      throw new Error("Font not loaded");
    }
    return this._font;
  }

  private promise: Promise<void>;
  constructor(data: string | ArrayBuffer) {
    this.promise = new Promise((resolve, reject) => {
      if (typeof data === "string") {
        opentype.load(data, (err, font) => {
          if (err || !font) {
            return reject(err);
          }
          this._font = font;
        });
      } else {
        this._font = opentype.parse(data);
      }
      resolve();
    });
  }

  public async waitLoading(): Promise<void> {
    return await this.promise;
  }
}
