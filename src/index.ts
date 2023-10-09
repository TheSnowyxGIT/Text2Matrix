import { Canvas } from "canvas";
import * as opentype from "opentype.js";

const fonts = new Map<string, Font>();

export async function addFont(fontPath: string): Promise<void> {
  if (!fonts.has(fontPath)) {
    const font = new Font(fontPath);
    await font.waitLoading();
    fonts.set(fontPath, font);
  }
}

export function hasFont(fontPath: string): boolean {
  return fonts.has(fontPath);
}

export function removeFont(fontPath: string): void {
  fonts.delete(fontPath);
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

  var canvas = new Canvas(width, height);
  var ctx = canvas.getContext("2d");
  const path = _font.font.getPath(text, 0, height, options.fontSize, {
    letterSpacing: options.letterSpacing,
  });
  path.draw(ctx as any);

  const imageData = ctx.getImageData(0, 0, width, height);
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
  constructor(private fontPath: string) {
    this.promise = new Promise((resolve, reject) => {
      opentype.load(this.fontPath, (err, font) => {
        if (err || !font) {
          reject(err);
        }
        this._font = font;
        resolve();
      });
    });
  }

  public async waitLoading(): Promise<void> {
    return await this.promise;
  }
}
