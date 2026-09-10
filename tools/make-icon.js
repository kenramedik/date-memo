// 외부 의존성 없이 앱 아이콘(ico/png)을 생성한다.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [14, 116, 144];
const FG = [255, 255, 255];

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inRoundRect(x, y, size) {
  const inset = size * 0.03;
  const r = size * 0.22;
  const lo = inset, hi = size - inset;
  const cx = Math.min(Math.max(x, lo + r), hi - r);
  const cy = Math.min(Math.max(y, lo + r), hi - r);
  if (x < lo || x > hi || y < lo || y > hi) return false;
  return Math.hypot(x - cx, y - cy) <= r;
}

function inCheck(x, y, size) {
  const s = size;
  const half = s * 0.062;
  const d = Math.min(
    distToSegment(x, y, s * 0.27, s * 0.53, s * 0.44, s * 0.70),
    distToSegment(x, y, s * 0.44, s * 0.70, s * 0.75, s * 0.31)
  );
  return d <= half;
}

function draw(size) {
  const out = Buffer.alloc(size * size * 4);
  const SS = 3; // 슈퍼샘플링으로 계단 현상 완화
  const total = SS * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgHits = 0, fgHits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (!inRoundRect(px, py, size)) continue;
          bgHits++;
          if (inCheck(px, py, size)) fgHits++;
        }
      }
      const i = (y * size + x) * 4;
      if (!bgHits) continue;
      const t = fgHits / bgHits;
      out[i] = Math.round(BG[0] * (1 - t) + FG[0] * t);
      out[i + 1] = Math.round(BG[1] * (1 - t) + FG[1] * t);
      out[i + 2] = Math.round(BG[2] * (1 - t) + FG[2] * t);
      out[i + 3] = Math.round((bgHits / total) * 255);
    }
  }
  return out;
}

function encodeIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + pngs.length * 16;
  const entries = [];
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e[0] = size >= 256 ? 0 : size;
    e[1] = size >= 256 ? 0 : size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map(p => p.data)]);
}

const dir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(dir, { recursive: true });

const sizes = [16, 24, 32, 48, 64, 128, 256];
const pngs = sizes.map(size => ({ size, data: encodePng(size, draw(size)) }));

fs.writeFileSync(path.join(dir, 'icon.ico'), encodeIco(pngs));
fs.writeFileSync(path.join(dir, 'icon.png'), pngs.find(p => p.size === 256).data);
fs.writeFileSync(path.join(dir, 'tray.png'), pngs.find(p => p.size === 32).data);

console.log('아이콘 생성 완료: assets/icon.ico, icon.png, tray.png');
