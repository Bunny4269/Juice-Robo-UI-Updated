/* ============================================================
   JUICE ROBO — ZERO-DEPENDENCY QR CODE GENERATOR
   Standard ISO/IEC 18004 Byte Mode QR Matrix & SVG Generator.
   Provides universal UPI QR code display without external CDNs
   or extra dependencies.
   ============================================================ */

const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);
for (let i = 0, x = 1; i < 255; i++) {
  GF256_EXP[i] = x;
  GF256_EXP[i + 255] = x;
  GF256_LOG[x] = i;
  x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
}

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function polyMul(p, q) {
  const r = new Uint8Array(p.length + q.length - 1);
  for (let i = 0; i < p.length; i++) {
    for (let j = 0; j < q.length; j++) {
      r[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return r;
}

function getGeneratorPoly(deg) {
  let g = new Uint8Array([1]);
  for (let i = 0; i < deg; i++) {
    g = polyMul(g, new Uint8Array([1, GF256_EXP[i]]));
  }
  return g;
}

// Table of QR specifications for EC Level M (medium: 15% error correction)
const QR_SPECS_M = [
  null,
  { v: 1, total: 26, data: 16, ec: 10, b: 1, align: [] },
  { v: 2, total: 44, data: 28, ec: 16, b: 1, align: [6, 18] },
  { v: 3, total: 70, data: 44, ec: 26, b: 1, align: [6, 22] },
  { v: 4, total: 100, data: 64, ec: 18, b: 2, align: [6, 26] },
  { v: 5, total: 134, data: 86, ec: 24, b: 2, align: [6, 30] },
  { v: 6, total: 172, data: 108, ec: 16, b: 4, align: [6, 34] },
  { v: 7, total: 196, data: 124, ec: 18, b: 4, align: [6, 22, 38] },
  { v: 8, total: 242, data: 154, ec: 22, b: 4, align: [6, 24, 42] },
  { v: 9, total: 292, data: 182, ec: 22, b: 5, align: [6, 26, 46] },
  { v: 10, total: 346, data: 216, ec: 26, b: 5, align: [6, 28, 50] },
];

function selectVersion(dataLength) {
  for (let v = 1; v <= 10; v++) {
    const spec = QR_SPECS_M[v];
    const headerBits = v < 10 ? 12 : 20;
    const availDataBits = spec.data * 8;
    if (headerBits + dataLength * 8 <= availDataBits) {
      return spec;
    }
  }
  throw new Error("Data exceeds QR Version 10 capacity");
}

function encodeData(dataStr, spec) {
  const bytes = new TextEncoder().encode(dataStr);
  const bitStream = [];
  function pushBits(val, len) {
    for (let i = len - 1; i >= 0; i--) {
      bitStream.push((val >>> i) & 1);
    }
  }

  // 1. Mode indicator: 0100 for 8-bit byte mode
  pushBits(0b0100, 4);

  // 2. Character count indicator
  const countBits = spec.v < 10 ? 8 : 16;
  pushBits(bytes.length, countBits);

  // 3. Data bytes
  for (const b of bytes) {
    pushBits(b, 8);
  }

  // 4. Terminator
  const totalDataBits = spec.data * 8;
  const termLen = Math.min(4, totalDataBits - bitStream.length);
  pushBits(0, termLen);

  // 5. Pad to multiple of 8
  while (bitStream.length % 8 !== 0) {
    bitStream.push(0);
  }

  const dataBytes = new Uint8Array(spec.data);
  for (let i = 0; i < bitStream.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bitStream[i + j];
    }
    dataBytes[i / 8] = b;
  }

  // 6. Pad with alternating 0xEC and 0x11
  let padIdx = bitStream.length / 8;
  let padVal = 0xec;
  while (padIdx < spec.data) {
    dataBytes[padIdx++] = padVal;
    padVal = padVal === 0xec ? 0x11 : 0xec;
  }

  return dataBytes;
}

function computeEcBlocks(dataBytes, spec) {
  const numBlocks = spec.b;
  const totalData = spec.data;
  const ecPerBlock = spec.ec;

  const baseBlockDataLen = Math.floor(totalData / numBlocks);
  const shortBlocks = numBlocks - (totalData % numBlocks);

  const gen = getGeneratorPoly(ecPerBlock);
  const dataBlocks = [];
  const ecBlocks = [];

  let dataOffset = 0;
  for (let i = 0; i < numBlocks; i++) {
    const blockLen = i < shortBlocks ? baseBlockDataLen : baseBlockDataLen + 1;
    const blockData = dataBytes.slice(dataOffset, dataOffset + blockLen);
    dataOffset += blockLen;
    dataBlocks.push(blockData);

    const div = new Uint8Array(blockLen + ecPerBlock);
    div.set(blockData);
    for (let j = 0; j < blockLen; j++) {
      const coef = div[j];
      if (coef !== 0) {
        for (let k = 0; k < gen.length; k++) {
          div[j + k] ^= gfMul(gen[k], coef);
        }
      }
    }
    ecBlocks.push(div.slice(blockLen));
  }

  const interleaved = [];
  const maxDataBlockLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let c = 0; c < maxDataBlockLen; c++) {
    for (let b = 0; b < numBlocks; b++) {
      if (c < dataBlocks[b].length) interleaved.push(dataBlocks[b][c]);
    }
  }

  for (let c = 0; c < ecPerBlock; c++) {
    for (let b = 0; b < numBlocks; b++) {
      interleaved.push(ecBlocks[b][c]);
    }
  }

  return new Uint8Array(interleaved);
}

export function generateQrMatrix(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Text must be a non-empty string");
  }

  const spec = selectVersion(text.length);
  const dataBytes = encodeData(text, spec);
  const codewordStream = computeEcBlocks(dataBytes, spec);

  const size = 17 + 4 * spec.v;
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  const isFunction = Array.from({ length: size }, () => Array(size).fill(false));

  function setFunction(r, c, val) {
    matrix[r][c] = val;
    isFunction[r][c] = true;
  }

  // 1. Finder patterns (7x7) + separators
  function placeFinder(top, left) {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setFunction(top + r, left + c, isBorder || isCenter ? 1 : 0);
      }
    }
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = top + r;
        const tc = left + c;
        if (tr >= 0 && tr < size && tc >= 0 && tc < size && !isFunction[tr][tc]) {
          setFunction(tr, tc, 0);
        }
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 2. Alignment patterns
  const alignCoords = spec.align;
  for (let i = 0; i < alignCoords.length; i++) {
    for (let j = 0; j < alignCoords.length; j++) {
      const ar = alignCoords[i];
      const ac = alignCoords[j];
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === alignCoords.length - 1) ||
        (i === alignCoords.length - 1 && j === 0)
      ) {
        continue;
      }
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2;
          const isCenter = r === 0 && c === 0;
          setFunction(ar + r, ac + c, isOuter || isCenter ? 1 : 0);
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) setFunction(6, i, i % 2 === 0 ? 1 : 0);
    if (!isFunction[i][6]) setFunction(i, 6, i % 2 === 0 ? 1 : 0);
  }

  // 4. Dark module
  setFunction(4 * spec.v + 9, 8, 1);

  // 5. Reserve format info
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) setFunction(8, i, 0);
    if (!isFunction[i][8]) setFunction(i, 8, 0);
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) setFunction(8, i, 0);
  }
  for (let i = size - 7; i < size; i++) {
    if (!isFunction[i][8]) setFunction(i, 8, 0);
  }

  // 6. Place data codewords
  let bitIdx = 0;
  const totalBits = codewordStream.length * 8;
  let upwards = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--;
    for (let vert = 0; vert < size; vert++) {
      const r = upwards ? size - 1 - vert : vert;
      for (let c = 0; c < 2; c++) {
        const col = right - c;
        if (!isFunction[r][col]) {
          let bit = 0;
          if (bitIdx < totalBits) {
            const byteVal = codewordStream[Math.floor(bitIdx / 8)];
            bit = (byteVal >>> (7 - (bitIdx % 8))) & 1;
            bitIdx++;
          }
          matrix[r][col] = bit;
        }
      }
    }
    upwards = !upwards;
  }

  // 7. Format bits: EC Level M (00) and Mask 000 (000)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isFunction[r][c] && (r + c) % 2 === 0) {
        matrix[r][c] ^= 1;
      }
    }
  }

  const fmtPosTopLeft = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = fmtPosTopLeft[i];
    matrix[r][c] = formatBits[i];
  }

  const fmtPosSplit = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8],
    [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5],
    [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1],
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = fmtPosSplit[i];
    matrix[r][c] = formatBits[i];
  }

  return matrix;
}

export function generateQrSvg(text, { size = 260, margin = 2 } = {}) {
  const matrix = generateQrMatrix(text);
  const n = matrix.length;
  const viewBoxSize = n + margin * 2;

  let pathData = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c] === 1) {
        pathData += `M${c + margin},${r + margin}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${size}" height="${size}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <path d="${pathData.trim()}" fill="#000000"/>
</svg>`;
}

export function generateQrDataUrl(text, options) {
  const svg = generateQrSvg(text, options);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
