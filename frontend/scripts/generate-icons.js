const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const OUT = path.resolve(__dirname, "..", "public");

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? ((crc >>> 1) ^ 0xedb88320) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(w, h, pixels) {
  const raw = Buffer.alloc(w * h * 3 + h);
  let off = 0;
  for (let y = 0; y < h; y++) {
    raw[off++] = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3;
      raw[off++] = pixels[idx];
      raw[off++] = pixels[idx + 1];
      raw[off++] = pixels[idx + 2];
    }
  }
  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

function fill(w, h, r, g, b) {
  const p = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    p[i * 3] = r;
    p[i * 3 + 1] = g;
    p[i * 3 + 2] = b;
  }
  return p;
}

function drawCircle(p, w, h, cx, cy, radius, r, g, b) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        const idx = (y * w + x) * 3;
        p[idx] = r;
        p[idx + 1] = g;
        p[idx + 2] = b;
      }
    }
  }
}

function drawRect(p, w, h, rx, ry, rw, rh, r, g, b) {
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const idx = (y * w + x) * 3;
      p[idx] = r;
      p[idx + 1] = g;
      p[idx + 2] = b;
    }
  }
}

function drawDumbbell(p, w, h) {
  const bg = [9, 9, 11];
  const yel = [255, 230, 0];
  const cyan = [0, 229, 255];

  fill(w, h, bg[0], bg[1], bg[2]);

  const cx = Math.floor(w / 2);
  const cy = Math.floor(h / 2);
  const barLen = Math.round(w * 0.47);
  const barH = Math.max(1, Math.round(h * 0.08));

  drawRect(p, w, h, Math.round(cx - barLen / 2), Math.round(cy - barH / 2), barLen, barH, yel[0], yel[1], yel[2]);

  const plateW = Math.round(w * 0.13);
  const plateH = Math.round(h * 0.4);
  const plateGap = Math.round(w * 0.02);

  drawRect(p, w, h, Math.round(cx - barLen / 2 - plateW + plateGap), Math.round(cy - plateH / 2), plateW, plateH, cyan[0], cyan[1], cyan[2]);
  drawRect(p, w, h, Math.round(cx + barLen / 2 - plateGap), Math.round(cy - plateH / 2), plateW, plateH, cyan[0], cyan[1], cyan[2]);
}

[192, 512].forEach((size) => {
  const pixels = Buffer.alloc(size * size * 3);
  drawDumbbell(pixels, size, size);
  const png = makePNG(size, size, pixels);
  fs.writeFileSync(path.join(OUT, `icon-${size}x${size}.png`), png);
  console.log(`Generated icon-${size}x${size}.png`);
});

fs.writeFileSync(
  path.join(OUT, "icon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#09090B"/>
  <rect x="136" y="235" width="240" height="42" rx="6" fill="#FFE600"/>
  <rect x="86" y="155" width="66" height="202" rx="10" fill="#00E5FF"/>
  <rect x="360" y="155" width="66" height="202" rx="10" fill="#00E5FF"/>
</svg>`
);
console.log("Generated icon.svg");
