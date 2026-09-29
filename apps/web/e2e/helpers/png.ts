import { inflateSync } from "node:zlib";

type DecodedPng = {
  width: number;
  height: number;
  channels: number;
  data: Buffer;
};

// Dependency-free PNG reader for pixel-level framing assertions: Playwright
// screenshots are 8-bit truecolor PNGs, and pulling in an image library for
// two specs is not worth the dependency weight.
export function decodePng(buf: Buffer): DecodedPng {
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  if (bitDepth !== 8) {
    throw new Error(`unsupported PNG bit depth: ${bitDepth}`);
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) {
    throw new Error(`unsupported PNG color type: ${colorType}`);
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  let p = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[p++];
    const cur = Buffer.from(raw.subarray(p, p + stride));
    p += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = cur[i];
      if (filter === 1) v = (v + a) & 0xff;
      else if (filter === 2) v = (v + b) & 0xff;
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        v = (v + pr) & 0xff;
      }
      cur[i] = v;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }
  return { width, height, channels, data: out };
}

// Fraction of soil/wood-toned pixels in a horizontal band of a screenshot
// (y0/y1 as height fractions). The farm's beds are the only reliably warm
// cluster in the frame, so a healthy ratio means the farm is still framed
// by the camera.
export function warmPixelRatio(png: Buffer, y0: number, y1: number): number {
  const { width, height, channels, data } = decodePng(png);
  let warm = 0;
  let total = 0;
  for (let y = Math.floor(height * y0); y < Math.floor(height * y1); y += 2) {
    for (let x = 0; x < width; x += 2) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r > g + 14 && r > b + 10 && r > 60) warm++;
      total++;
    }
  }
  return total === 0 ? 0 : warm / total;
}
