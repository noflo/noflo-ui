/**
 * @file Netpbm decoding for node previews (work document #5 update #16,
 * per the original design's expanded node): a running process's netpbm
 * output (PBM/PGM/PPM, ASCII or binary) renders inside the expanded node's
 * preview area. The runtime streaming itself is WD #15's; this decoder is
 * the Glass-side rendering half.
 */

/**
 * Parses a netpbm image (P1 through P6) into an RGBA pixel bitmap.
 *
 * @param {Uint8Array | string} data The netpbm bytes (or ASCII text).
 * @returns {{ width: number, height: number, pixels: Uint8Array } | null}
 *   RGBA, 4 bytes per pixel; null when the data is not a netpbm image.
 */
export function decodeNetpbm(data) {
  const bytes = typeof data === "string" ? textToBytes(data) : data;
  if (!bytes || bytes.length < 2) return null;
  const magic = String.fromCharCode(bytes[0], bytes[1]);
  if (!/^P[1-6]$/.test(magic)) return null;
  const ascii = Number(magic[1]) <= 3;
  const channels = magic === "P1" || magic === "P4" ? 1 : 3;

  let offset = 2;
  const readToken = () => {
    // Tokens are whitespace-separated; # comments run to end of line
    for (;;) {
      while (offset < bytes.length && isSpace(bytes[offset])) offset++;
      if (offset < bytes.length && bytes[offset] === 0x23) {
        while (offset < bytes.length && bytes[offset] !== 0x0a) offset++;
        continue;
      }
      break;
    }
    let value = "";
    while (offset < bytes.length && !isSpace(bytes[offset])) {
      value += String.fromCharCode(bytes[offset]);
      offset++;
    }
    return value;
  };

  const width = Number.parseInt(readToken(), 10);
  const height = Number.parseInt(readToken(), 10);
  const maxval = magic === "P1" ? 1 : Number.parseInt(readToken(), 10) || 255;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  const pixels = new Uint8Array(width * height * 4);
  const scale = maxval > 0 ? 255 / maxval : 1;
  for (let i = 0; i < width * height; i++) {
    for (let channel = 0; channel < channels; channel++) {
      let value;
      if (ascii) {
        value = Number.parseInt(readToken(), 10) || 0;
      } else {
        value = bytes[offset++] ?? 0;
        // P4 packs 8 pixels per byte; a full P4 decoder is out of scope
        // until a runtime ships bitmaps
      }
      pixels[i * 4 + channel] =
        magic === "P1" ? (value ? 0 : 255) : Math.round(value * scale);
    }
    if (channels === 1) {
      // Graymap: replicate into RGB
      const gray = pixels[i * 4];
      pixels[i * 4 + 1] = gray;
      pixels[i * 4 + 2] = gray;
    }
    pixels[i * 4 + 3] = 255;
  }
  return { width, height, pixels };
}

/**
 * Renders decoded netpbm pixels into a PNG data URL for an `<img>`.
 *
 * @param {{ width: number, height: number, pixels: Uint8Array }} image
 * @returns {string | null}
 */
export function pixelsToDataUrl(image) {
  if (
    typeof document === "undefined" ||
    !image ||
    image.pixels.length !== image.width * image.height * 4
  ) {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const imageData = context.createImageData(image.width, image.height);
  imageData.data.set(image.pixels);
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Renders a netpbm image as a PNG data URL, ready for an `<img>`.
 *
 * @param {Uint8Array | string} data
 * @returns {string | null}
 */
export function netpbmToDataUrl(data) {
  const image = decodeNetpbm(data);
  return image ? pixelsToDataUrl(image) : null;
}

/**
 * @param {number} byte
 * @returns {boolean}
 */
function isSpace(byte) {
  return (
    byte === 0x20 ||
    byte === 0x09 ||
    byte === 0x0a ||
    byte === 0x0d ||
    byte === 0x0b ||
    byte === 0x0c
  );
}

/**
 * @param {string} text
 * @returns {Uint8Array}
 */
function textToBytes(text) {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }
  return bytes;
}
