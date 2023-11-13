import type { Canvas } from "canvas";
import { Font, Metrics } from "./font";
import { Path } from "opentype.js";

export type Options = {
  fontSize?: number;
  normalizeSize?: boolean;
};

export class Text {
  private textPath: Path;
  private metrics: Metrics;
  public readonly width: number;
  public readonly height: number;
  public readonly matrix: number[][] = [];
  public get pivot(): { x: number; y: number } {
    return {
      x: 0,
      y: Math.floor(this.metrics.ascender),
    };
  }
  constructor(
    private readonly text: string,
    private readonly font: Font,
    private readonly option: Options
  ) {
    this.option.normalizeSize =
      this.option.normalizeSize === undefined
        ? true
        : this.option.normalizeSize;
    let fontSize = this.option.fontSize || 15;
    if (this.option.normalizeSize) {
      fontSize = font.sizeNormalizer(fontSize);
    }

    this.metrics = this.font.getMetrics(fontSize);

    const sizePath = this.font.font.getPath(this.text, 0, 0, fontSize);
    let boundingBox = sizePath.getBoundingBox();
    this.width = Math.ceil(Math.abs(boundingBox.x2 - boundingBox.x1));
    this.height = Math.ceil(
      Math.abs(this.metrics.ascender - this.metrics.descender)
    );
    const { ctx } = this.getCanvas(this.height, this.width);

    this.textPath = this.font.font.getPath(
      this.text,
      -boundingBox.x1,
      this.metrics.ascender,
      fontSize
    );
    this.textPath.draw(ctx);
    const imageData = ctx!.getImageData(0, 0, this.width, this.height);
    const matrix = [];

    for (let y = this.height - 1; y >= 0; y--) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        const idx = (y * this.width + x) * 4 + 3;
        const value = imageData.data[idx] / 255;
        row.push(value);
      }
      matrix.push(row);
    }
    this.matrix = matrix;
  }

  private getCanvas(
    height: number,
    width: number
  ): {
    canvas: Canvas | HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } {
    let canvas: Canvas | HTMLCanvasElement;
    let ctx2d: CanvasRenderingContext2D;
    if (typeof window === "undefined") {
      const Canvas = require("canvas").Canvas;
      canvas = new Canvas(width, height);
      const ctx = canvas.getContext("2d");
      ctx2d = ctx as CanvasRenderingContext2D;
    } else {
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx2d = ctx as CanvasRenderingContext2D;
    }
    return { canvas, ctx: ctx2d };
  }

  public draw() {
    const { canvas, ctx } = this.getCanvas(this.height, this.width);
    const metrics = this.metrics;
    ctx.strokeStyle = "blue";
    this.textPath.draw(ctx);
    ctx.moveTo(0, metrics.ascender);
    ctx.lineTo(this.width, metrics.ascender);
    ctx.moveTo(0, metrics.ascender - metrics.xHeight);
    ctx.lineTo(this.width, metrics.ascender - metrics.xHeight);
    ctx.moveTo(0, metrics.ascender - metrics.capHeight);
    ctx.lineTo(this.width, metrics.ascender - metrics.capHeight);
    ctx.lineWidth = 1;
    ctx.stroke();
    if (typeof window === "undefined") {
      (canvas as Canvas)
        .createPNGStream()
        .pipe(require("fs").createWriteStream("metrics.png"));
    }
  }
}
