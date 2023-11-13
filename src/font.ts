import * as opentype from "opentype.js";

export interface Metrics {
  ascender: number;
  descender: number;
  capHeight: number;
  xHeight: number;
  lineGap: number;
}

function getSizeNormalizer(font: Font) {
  const x1 = 8;
  const x2 = 16;
  const y1 = estimateFontSize(font, x1);
  const y2 = estimateFontSize(font, x2);
  const a = (y2 - y1) / (x2 - x1);
  const b = y1 - a * x1;
  return (x: number) => a * x + b;
}

function getMaxHeight(font: Font, fontSize: number): number {
  return font.getMetrics(fontSize).ascender;
}

export function estimateFontSize(font: Font, maxHeight: number): number {
  let previousSize = 0;
  let currentSize = maxHeight;
  while (true) {
    const height = getMaxHeight(font, currentSize);

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

export class Font {
  static fromPath(path: string): Promise<Font> {
    return new Promise((resolve, reject) => {
      opentype.load(path, (err, font) => {
        if (err || !font) {
          throw err;
        }
        resolve(new Font(font));
      });
    });
  }

  static from(font: opentype.Font | ArrayBuffer): Font {
    return new Font(font);
  }

  private _font: opentype.Font;
  public get font(): opentype.Font {
    return this._font;
  }

  public readonly unitsPerEm: number;
  public readonly metrics: Metrics;
  public readonly sizeNormalizer: (x: number) => number;

  private constructor(data: ArrayBuffer | opentype.Font) {
    if (data instanceof opentype.Font) {
      this._font = data;
    } else {
      this._font = opentype.parse(data);
    }
    this.unitsPerEm = this.font.unitsPerEm;
    this.metrics = {
      ascender: this.font.ascender,
      descender: this.font.descender,
      capHeight: this.font.tables.os2.sCapHeight,
      xHeight: this.font.tables.os2.sxHeight,
      lineGap: this.font.tables.os2.sTypoLineGap,
    };
    this.sizeNormalizer = getSizeNormalizer(this);
  }

  getMetrics(size: number): Metrics {
    return {
      ascender: (this.metrics.ascender / this.unitsPerEm) * size,
      descender: (this.metrics.descender / this.unitsPerEm) * size,
      capHeight: (this.metrics.capHeight / this.unitsPerEm) * size,
      xHeight: (this.metrics.xHeight / this.unitsPerEm) * size,
      lineGap: (this.metrics.lineGap / this.unitsPerEm) * size,
    };
  }
}
