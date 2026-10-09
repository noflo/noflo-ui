// node_modules/@noble/hashes/_u64.js
var U32_MASK64 = /* @__PURE__ */ (() => BigInt(2 ** 32 - 1))();
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var fromNumH = (n) => n / 2 ** 32 | 0;
var fromNumL = (n) => n >>> 0;
function setU64FromNum(view, byteOffset, n, isLE) {
  const h = fromNumH(n);
  const l = fromNumL(n);
  view.setUint32(byteOffset, isLE ? l : h, isLE);
  view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}
var shrSH = (h, _l, s) => h >>> s;
var shrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;

// node_modules/@noble/hashes/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
var atitle = (title) => title ? `"${title}" ` : "";
function anumber(n, title = "") {
  if (typeof n !== "number")
    throw new TypeError(atitle(title) + "expected number, got " + typeof n);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
  return n;
}
function abytes(value, length, title = "") {
  if (isBytes(value) && (length === void 0 || value.length === length))
    return value;
  if (length !== void 0)
    anumber(length, "length");
  const bytes = isBytes(value);
  const ofLen = length !== void 0 ? ` of length ${length}` : "";
  const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
  const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
  if (!bytes)
    throw new TypeError(message);
  throw new RangeError(message);
}
var aobject = (value, label) => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
};
var aopts = (value, label) => {
  aobject(value, label);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null)
    throw new TypeError(`"${label}" expected plain object`);
  if (Object.hasOwn(value, "__proto__"))
    throw new TypeError(`"${label}.__proto__" is not allowed`);
};
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("hash was destroyed");
  if (checkFinished && instance.finished)
    throw new Error("digest() was already called");
}
function aoutput(out, instance) {
  abytes(out, void 0, "output");
  const min = instance.outputLen;
  if (!(out.length >= min)) {
    throw new RangeError('"output" expected length >= ' + min);
  }
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
var hasHexBuiltin = /* @__PURE__ */ (() => (
  // @ts-ignore
  typeof Uint8Array.from([]).toHex === "function" && typeof Uint8Array.fromHex === "function"
))();
var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
function bytesToHex(bytes) {
  abytes(bytes);
  if (hasHexBuiltin)
    return bytes.toHex();
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += hexes[bytes[i]];
  }
  return hex;
}
function asciiToBase16(ch) {
  return ch >= 48 && ch <= 57 ? ch - 48 : ch >= 65 && ch <= 70 ? ch - (65 - 10) : ch >= 97 && ch <= 102 ? ch - (97 - 10) : void 0;
}
function hexToBytes(hex) {
  if (typeof hex !== "string")
    throw new TypeError("hex string expected, got " + typeof hex);
  if (hasHexBuiltin) {
    try {
      return Uint8Array.fromHex(hex);
    } catch (error) {
      if (error instanceof SyntaxError)
        throw new RangeError(error.message);
      throw error;
    }
  }
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new RangeError("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new RangeError('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new TypeError("string expected");
  const encoded = new TextEncoder().encode(str);
  try {
    return new Uint8Array(encoded);
  } finally {
    clean(encoded);
  }
}
function concatBytes(...arrays) {
  let sum = 0;
  for (let i = 0; i < arrays.length; i++) {
    const a = arrays[i];
    abytes(a);
    sum += a.length;
  }
  const res = new Uint8Array(sum);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const a = arrays[i];
    res.set(a, pad);
    pad += a.length;
  }
  return res;
}
function checkOpts(defaults, opts, title = "opts") {
  aopts(defaults, "defaults");
  if (opts !== void 0)
    aopts(opts, title);
  const merged = Object.assign(/* @__PURE__ */ Object.create(null), defaults, opts);
  return merged;
}
function createHasher(hashCons, info = {}) {
  if (typeof hashCons !== "function")
    throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
  info = checkOpts({}, info, "info");
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.canXOF = tmp.canXOF;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
function randomBytes(bytesLength = 32) {
  anumber(bytesLength, "bytesLength");
  const cr = typeof globalThis === "object" ? globalThis.crypto : null;
  if (typeof cr?.getRandomValues !== "function")
    throw new Error("crypto.getRandomValues must be defined");
  if (bytesLength > 65536)
    throw new RangeError(`"bytesLength" expected <= 65536, got ${bytesLength}`);
  return cr.getRandomValues(new Uint8Array(bytesLength));
}
var oidNist = (suffix) => ({
  // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
  // Larger suffix values would need base-128 OID encoding and a different length byte.
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
});

// node_modules/@noble/hashes/_md.js
var HashMD = class {
  blockLen;
  outputLen;
  canXOF = false;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = false;
  length = 0;
  pos = 0;
  destroyed = false;
  constructor(blockLen, outputLen, padOffset, isLE) {
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    let processed = false;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        processed = true;
        continue;
      }
      buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
        processed = true;
      }
    }
    this.length += data.length;
    if (processed)
      this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    buffer.fill(0, pos);
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      buffer.fill(0);
    }
    setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
    this.process(view, 0);
    this.roundClean();
    const oview = out === buffer ? view : createView(out);
    const len = this.outputLen;
    const outLen = len / 4;
    const state = this.get();
    if (len % 4 || outLen > state.length)
      throw new Error("invalid outputLen");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneIntoMeta(to) {
    const { buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (pos)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA512_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  4089235720,
  3144134277,
  2227873595,
  1013904242,
  4271175723,
  2773480762,
  1595750129,
  1359893119,
  2917565137,
  2600822924,
  725511199,
  528734635,
  4215389547,
  1541459225,
  327033209
]);

// node_modules/@noble/hashes/sha2.js
var K512 = /* @__PURE__ */ (() => split([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((n) => BigInt(n))))();
var SHA512_Kh = /* @__PURE__ */ (() => K512[0])();
var SHA512_Kl = /* @__PURE__ */ (() => K512[1])();
var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
var SHA2_64B = class extends HashMD {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  // h -- high 32 bits, l -- low 32 bits
  // Numeric initializers matter: starting the fields as `undefined` changes
  // V8's field representation and slows hashing down (measured on sha256).
  Ah = 0;
  Al = 0;
  Bh = 0;
  Bl = 0;
  Ch = 0;
  Cl = 0;
  Dh = 0;
  Dl = 0;
  Eh = 0;
  El = 0;
  Fh = 0;
  Fl = 0;
  Gh = 0;
  Gl = 0;
  Hh = 0;
  Hl = 0;
  constructor(outputLen, IV) {
    super(128, outputLen, 16, false);
    this.Ah = IV[0] | 0;
    this.Al = IV[1] | 0;
    this.Bh = IV[2] | 0;
    this.Bl = IV[3] | 0;
    this.Ch = IV[4] | 0;
    this.Cl = IV[5] | 0;
    this.Dh = IV[6] | 0;
    this.Dl = IV[7] | 0;
    this.Eh = IV[8] | 0;
    this.El = IV[9] | 0;
    this.Fh = IV[10] | 0;
    this.Fl = IV[11] | 0;
    this.Gh = IV[12] | 0;
    this.Gl = IV[13] | 0;
    this.Hh = IV[14] | 0;
    this.Hl = IV[15] | 0;
  }
  // prettier-ignore
  get() {
    const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
  }
  // prettier-ignore
  set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
    this.Ah = Ah | 0;
    this.Al = Al | 0;
    this.Bh = Bh | 0;
    this.Bl = Bl | 0;
    this.Ch = Ch | 0;
    this.Cl = Cl | 0;
    this.Dh = Dh | 0;
    this.Dl = Dl | 0;
    this.Eh = Eh | 0;
    this.El = El | 0;
    this.Fh = Fh | 0;
    this.Fl = Fl | 0;
    this.Gh = Gh | 0;
    this.Gl = Gl | 0;
    this.Hh = Hh | 0;
    this.Hl = Hl | 0;
  }
  _cloneInto(to) {
    (to ||= new this.constructor()).set(...this.get());
    return this._cloneIntoMeta(to);
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4) {
      SHA512_W_H[i] = view.getUint32(offset);
      SHA512_W_L[i] = view.getUint32(offset += 4);
    }
    for (let i = 16; i < 80; i++) {
      const W15h = SHA512_W_H[i - 15] | 0;
      const W15l = SHA512_W_L[i - 15] | 0;
      const s0h = rotrSH(W15h, W15l, 1) ^ rotrSH(W15h, W15l, 8) ^ shrSH(W15h, W15l, 7);
      const s0l = rotrSL(W15h, W15l, 1) ^ rotrSL(W15h, W15l, 8) ^ shrSL(W15h, W15l, 7);
      const W2h = SHA512_W_H[i - 2] | 0;
      const W2l = SHA512_W_L[i - 2] | 0;
      const s1h = rotrSH(W2h, W2l, 19) ^ rotrBH(W2h, W2l, 61) ^ shrSH(W2h, W2l, 6);
      const s1l = rotrSL(W2h, W2l, 19) ^ rotrBL(W2h, W2l, 61) ^ shrSL(W2h, W2l, 6);
      const SUMl = add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
      const SUMh = add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
      SHA512_W_H[i] = SUMh | 0;
      SHA512_W_L[i] = SUMl | 0;
    }
    let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    for (let i = 0; i < 80; i++) {
      const sigma1h = rotrSH(Eh, El, 14) ^ rotrSH(Eh, El, 18) ^ rotrBH(Eh, El, 41);
      const sigma1l = rotrSL(Eh, El, 14) ^ rotrSL(Eh, El, 18) ^ rotrBL(Eh, El, 41);
      const CHIh = Eh & Fh ^ ~Eh & Gh;
      const CHIl = El & Fl ^ ~El & Gl;
      const T1ll = add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
      const T1h = add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
      const T1l = T1ll | 0;
      const sigma0h = rotrSH(Ah, Al, 28) ^ rotrBH(Ah, Al, 34) ^ rotrBH(Ah, Al, 39);
      const sigma0l = rotrSL(Ah, Al, 28) ^ rotrBL(Ah, Al, 34) ^ rotrBL(Ah, Al, 39);
      const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
      const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
      Hh = Gh | 0;
      Hl = Gl | 0;
      Gh = Fh | 0;
      Gl = Fl | 0;
      Fh = Eh | 0;
      Fl = El | 0;
      ({ h: Eh, l: El } = add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
      Dh = Ch | 0;
      Dl = Cl | 0;
      Ch = Bh | 0;
      Cl = Bl | 0;
      Bh = Ah | 0;
      Bl = Al | 0;
      const All = add3L(T1l, sigma0l, MAJl);
      Ah = add3H(All, T1h, sigma0h, MAJh);
      Al = All | 0;
    }
    ({ h: Ah, l: Al } = add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
    ({ h: Bh, l: Bl } = add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
    ({ h: Ch, l: Cl } = add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
    ({ h: Dh, l: Dl } = add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
    ({ h: Eh, l: El } = add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
    ({ h: Fh, l: Fl } = add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
    ({ h: Gh, l: Gl } = add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
    ({ h: Hh, l: Hl } = add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
    this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
  }
  roundClean() {
    clean(SHA512_W_H, SHA512_W_L);
  }
  destroy() {
    this.destroyed = true;
    clean(this.buffer);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var _SHA512 = class extends SHA2_64B {
  constructor() {
    super(64, SHA512_IV);
  }
};
var sha512 = /* @__PURE__ */ createHasher(
  () => new _SHA512(),
  /* @__PURE__ */ oidNist(3)
);

// node_modules/@noble/curves/utils.js
function aarray(item, title, inner = () => {
}) {
  if (!Array.isArray(item))
    throw new TypeError(`"${title}" expected array, got type=${typeof item}`);
  for (let i = 0; i < item.length; i++)
    inner(item[i], `${title}[${i}]`);
  return item;
}
var abytes2 = (value, length, title) => abytes(value, length, title);
var anumber2 = anumber;
function astring(value, title = "") {
  if (typeof value !== "string") {
    const prefix = title && `"${title}" `;
    throw new TypeError(prefix + "expected string, got type=" + typeof value);
  }
  return value;
}
function aobject2(value, title = "object") {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new TypeError(title === "object" ? "expected valid options object" : `"${title}" expected object, got type=${typeof value}`);
  return value;
}
function afunction(value, title) {
  if (typeof value !== "function")
    throw new TypeError(`"${title}" is invalid: expected function, got ${typeof value}`);
  return value;
}
var bytesToHex2 = bytesToHex;
var concatBytes2 = (...arrays) => concatBytes(...arrays);
var hexToBytes2 = (hex) => hexToBytes(hex);
var isBytes2 = isBytes;
var randomBytes2 = (bytesLength) => randomBytes(bytesLength);
var _0n = /* @__PURE__ */ BigInt(0);
var _1n = /* @__PURE__ */ BigInt(1);
var atitle2 = (title) => title ? `"${title}" ` : "";
function abool(value, title = "") {
  if (typeof value !== "boolean")
    throw new TypeError(atitle2(title) + "expected boolean, got type=" + typeof value);
  return value;
}
function abignumber(n) {
  if (typeof n === "bigint") {
    if (!isPosBig(n))
      throw new RangeError("positive bigint expected, got " + n);
  } else
    anumber2(n);
  return n;
}
function asafenumber(value, title = "") {
  if (typeof value !== "number") {
    const prefix = title && `"${title}" `;
    throw new TypeError(prefix + "expected number, got type=" + typeof value);
  }
  if (!Number.isSafeInteger(value)) {
    const prefix = title && `"${title}" `;
    throw new RangeError(prefix + "expected safe integer, got " + value);
  }
}
function hexToNumber(hex) {
  if (typeof hex !== "string")
    throw new TypeError("hex string expected, got " + typeof hex);
  return hex === "" ? _0n : BigInt("0x" + hex);
}
function bytesToNumberBE(bytes) {
  return hexToNumber(bytesToHex(bytes));
}
function bytesToNumberLE(bytes) {
  return hexToNumber(bytesToHex(copyBytes(abytes(bytes)).reverse()));
}
function numberToBytesBE(n, len) {
  anumber(len);
  if (len === 0)
    throw new Error("zero output length is invalid");
  n = abignumber(n);
  const expectedLen = len * 2;
  const hex = n.toString(16);
  if (hex.length > expectedLen)
    throw new RangeError("number is too large");
  return hexToBytes(hex.padStart(expectedLen, "0"));
}
function numberToBytesLE(n, len) {
  return numberToBytesBE(n, len).reverse();
}
function equalBytes(a, b) {
  a = abytes2(a);
  b = abytes2(b);
  if (a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++)
    diff |= a[i] ^ b[i];
  return diff === 0;
}
function copyBytes(bytes) {
  return Uint8Array.from(abytes2(bytes));
}
function asciiToBytes(ascii) {
  if (typeof ascii !== "string")
    throw new TypeError("ascii string expected, got " + typeof ascii);
  return Uint8Array.from(ascii, (c, i) => {
    const charCode = c.charCodeAt(0);
    if (c.length !== 1 || charCode > 127) {
      throw new RangeError(`string contains non-ASCII character "${ascii[i]}" with code ${charCode} at position ${i}`);
    }
    return charCode;
  });
}
function isPosBig(n) {
  return typeof n === "bigint" && _0n <= n;
}
function inRange(n, min, max) {
  return isPosBig(n) && isPosBig(min) && isPosBig(max) && min <= n && n < max;
}
function aInRange(title, n, min, max) {
  if (!inRange(n, min, max))
    throw new RangeError("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n);
}
function bitLen(n) {
  if (n < _0n)
    throw new Error("expected non-negative bigint, got " + n);
  return n === _0n ? 0 : n.toString(2).length;
}
var bitMask = (n) => {
  asafenumber(n, "n");
  return (_1n << BigInt(n)) - _1n;
};
function validateObject(object, fields = {}, optFields = {}, title = "object") {
  aobject2(object, title);
  aobject2(fields, "fields");
  aobject2(optFields, "optFields");
  function checkField(fieldName, expectedType, isOpt) {
    const label = title === "object" ? `param "${String(fieldName)}"` : `"${title}.${String(fieldName)}"`;
    const val = object[fieldName];
    if (!Object.hasOwn(object, fieldName) && (isOpt ? val !== void 0 : expectedType !== "function")) {
      throw new TypeError(`${label} is invalid: expected own property`);
    }
    if (isOpt && val === void 0)
      return;
    const current = typeof val;
    if (current !== expectedType || val === null)
      throw new TypeError(`${label} is invalid: expected ${expectedType}, got ${current}`);
  }
  const iter = (f, isOpt) => Object.entries(f).forEach(([k, v]) => checkField(k, v, isOpt));
  iter(fields, false);
  iter(optFields, true);
}
var notImplemented = () => {
  throw new Error("not implemented");
};

// node_modules/@noble/curves/abstract/modular.js
var _0n2 = /* @__PURE__ */ BigInt(0);
var _1n2 = /* @__PURE__ */ BigInt(1);
var _2n = /* @__PURE__ */ BigInt(2);
var _3n = /* @__PURE__ */ BigInt(3);
var _4n = /* @__PURE__ */ BigInt(4);
var _5n = /* @__PURE__ */ BigInt(5);
var _7n = /* @__PURE__ */ BigInt(7);
var _8n = /* @__PURE__ */ BigInt(8);
var _9n = /* @__PURE__ */ BigInt(9);
var _15n = /* @__PURE__ */ BigInt(15);
var _16n = /* @__PURE__ */ BigInt(16);
var POW_WINDOWED_MIN = /* @__PURE__ */ BigInt("0x10000000000000000");
function mod(a, b) {
  if (b <= _0n2)
    throw new Error("mod: expected positive modulus, got " + b);
  const result = a % b;
  return result >= _0n2 ? result : b + result;
}
function pow(num, power, modulo) {
  if (modulo <= _1n2)
    throw new Error("pow: expected modulus > 1, got " + modulo);
  if (typeof power !== "bigint")
    throw new TypeError("invalid exponent: expected bigint, got " + typeof power);
  if (power < _0n2)
    throw new Error("invalid exponent, negatives unsupported");
  if (power === _0n2)
    return _1n2;
  if (power === _1n2)
    return num;
  let d = num % modulo;
  if (d < _0n2)
    d += modulo;
  if (power < POW_WINDOWED_MIN) {
    let p2 = _1n2;
    while (power > _0n2) {
      if (power & _1n2)
        p2 = p2 * d % modulo;
      d = d * d % modulo;
      power >>= _1n2;
    }
    return p2;
  }
  const digits = [];
  while (power > _0n2) {
    digits.push(Number(power & _15n));
    power >>= _4n;
  }
  const table = new Array(16);
  table[0] = _1n2;
  table[1] = d;
  for (let i = 2; i < 16; i++)
    table[i] = table[i - 1] * d % modulo;
  let p = table[digits[digits.length - 1]];
  for (let w = digits.length - 2; w >= 0; w--) {
    p = p * p % modulo;
    p = p * p % modulo;
    p = p * p % modulo;
    p = p * p % modulo;
    const digit = digits[w];
    if (digit !== 0)
      p = p * table[digit] % modulo;
  }
  return p;
}
function pow2(x, power, modulo) {
  if (modulo <= _1n2)
    throw new Error("pow2: expected modulus > 1, got " + modulo);
  if (power < _0n2)
    throw new Error("pow2: expected non-negative exponent, got " + power);
  let res = x;
  while (power-- > _0n2) {
    res *= res;
    res %= modulo;
  }
  return res;
}
function invert(number, modulo) {
  if (number === _0n2)
    throw new Error("invert: expected non-zero number");
  if (modulo <= _1n2)
    throw new Error("invert: expected modulus > 1, got " + modulo);
  let a = mod(number, modulo);
  let b = modulo;
  let x = _0n2, u = _1n2;
  while (a !== _0n2) {
    const q = b / a;
    const r = b - a * q;
    const m = x - u * q;
    b = a, a = r, x = u, u = m;
  }
  const gcd = b;
  if (gcd !== _1n2)
    throw new Error("invert: does not exist");
  return mod(x, modulo);
}
function invertCt(a, prime) {
  if (prime <= _1n2)
    throw new Error("invertCt: expected prime modulus > 1, got " + prime);
  const an = mod(a, prime);
  if (an === _0n2)
    throw new Error("invertCt: expected non-zero number");
  const inverse = pow(an, prime - _2n, prime);
  if (mod(an * inverse, prime) !== _1n2)
    throw new Error("invertCt: does not exist");
  return inverse;
}
function assertIsSquare(Fp2, root, n) {
  const F = Fp2;
  if (!F.eql(F.sqr(root), n))
    throw new Error("Cannot find square root");
}
function aoddModulus(order, fnName) {
  if ((order & _1n2) === _0n2)
    throw new Error(fnName + ": expected odd modulus, got " + order);
}
function sqrt3mod4(Fp2, n) {
  const F = Fp2;
  const p1div4 = (F.ORDER + _1n2) / _4n;
  const root = F.pow(n, p1div4);
  assertIsSquare(F, root, n);
  return root;
}
function sqrt5mod8(Fp2, n) {
  const F = Fp2;
  const p5div8 = (F.ORDER - _5n) / _8n;
  const n2 = F.mul(n, _2n);
  const v = F.pow(n2, p5div8);
  const nv = F.mul(n, v);
  const i = F.mul(F.mul(nv, _2n), v);
  const root = F.mul(nv, F.sub(i, F.ONE));
  assertIsSquare(F, root, n);
  return root;
}
function sqrt9mod16(P) {
  const Fp_ = Field(P);
  const tn = tonelliShanks(P);
  const c1 = tn(Fp_, Fp_.neg(Fp_.ONE));
  const c2 = tn(Fp_, c1);
  const c3 = tn(Fp_, Fp_.neg(c1));
  const c4 = (P + _7n) / _16n;
  return ((Fp2, n) => {
    const F = Fp2;
    let tv1 = F.pow(n, c4);
    let tv2 = F.mul(tv1, c1);
    const tv3 = F.mul(tv1, c2);
    const tv4 = F.mul(tv1, c3);
    const e1 = F.eql(F.sqr(tv2), n);
    const e2 = F.eql(F.sqr(tv3), n);
    tv1 = F.cmov(tv1, tv2, e1);
    tv2 = F.cmov(tv4, tv3, e2);
    const e3 = F.eql(F.sqr(tv2), n);
    const root = F.cmov(tv1, tv2, e3);
    assertIsSquare(F, root, n);
    return root;
  });
}
function tonelliShanks(P) {
  if (P < _3n)
    throw new Error("sqrt is not defined for small field");
  aoddModulus(P, "tonelliShanks");
  let Q = P - _1n2;
  let S = 0;
  while (Q % _2n === _0n2) {
    Q /= _2n;
    S++;
  }
  let Z = _2n;
  const _Fp = Field(P);
  while (FpLegendre(_Fp, Z) === 1) {
    if (Z++ > 1e3)
      throw new Error("Cannot find square root: probably non-prime P");
  }
  if (S === 1)
    return sqrt3mod4;
  let cc = _Fp.pow(Z, Q);
  const Q1div2 = (Q + _1n2) / _2n;
  return function tonelliSlow(Fp2, n) {
    const F = Fp2;
    if (F.is0(n))
      return n;
    if (FpLegendre(F, n) !== 1)
      throw new Error("Cannot find square root");
    let M = S;
    let c = F.mul(F.ONE, cc);
    let t = F.pow(n, Q);
    let R = F.pow(n, Q1div2);
    while (!F.eql(t, F.ONE)) {
      if (F.is0(t))
        throw new Error("Cannot find square root: probably non-prime P");
      let i = 1;
      let t_tmp = F.sqr(t);
      while (!F.eql(t_tmp, F.ONE)) {
        i++;
        t_tmp = F.sqr(t_tmp);
        if (i === M)
          throw new Error("Cannot find square root");
      }
      const exponent = _1n2 << BigInt(M - i - 1);
      const b = F.pow(c, exponent);
      M = i;
      c = F.sqr(b);
      t = F.mul(t, c);
      R = F.mul(R, b);
    }
    return R;
  };
}
function FpSqrt(P) {
  aoddModulus(P, "Fp.sqrt");
  if (P % _4n === _3n)
    return sqrt3mod4;
  if (P % _8n === _5n)
    return sqrt5mod8;
  if (P % _16n === _9n)
    return sqrt9mod16(P);
  return tonelliShanks(P);
}
var isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n2) === _1n2;
var FIELD_FIELDS = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function validateField(field) {
  aobject2(field, "field");
  if (typeof field.ORDER !== "bigint")
    throw new TypeError('param "ORDER" is invalid: expected bigint, got ' + typeof field.ORDER);
  asafenumber(field.BYTES, "BYTES");
  asafenumber(field.BITS, "BITS");
  for (const name of FIELD_FIELDS)
    afunction(field[name], "field." + name);
  if (field.BYTES < 1 || field.BITS < 1)
    throw new Error("invalid field: expected BYTES/BITS > 0");
  if (field.ORDER <= _1n2)
    throw new Error("invalid field: expected ORDER > 1, got " + field.ORDER);
  return field;
}
function FpInvertBatch(Fp2, nums, passZero = false) {
  validateField(Fp2);
  aarray(nums, "nums");
  abool(passZero, "passZero");
  const F = Fp2;
  const inverted = new Array(nums.length).fill(passZero ? F.ZERO : void 0);
  const multipliedAcc = nums.reduce((acc, num, i) => {
    if (F.is0(num))
      return acc;
    inverted[i] = acc;
    return F.mul(acc, num);
  }, F.ONE);
  const invertedAcc = F.inv(multipliedAcc);
  nums.reduceRight((acc, num, i) => {
    if (F.is0(num))
      return acc;
    inverted[i] = F.mul(acc, inverted[i]);
    return F.mul(acc, num);
  }, invertedAcc);
  return inverted;
}
function FpLegendre(Fp2, n) {
  validateField(Fp2);
  const F = Fp2;
  aoddModulus(F.ORDER, "FpLegendre");
  const p1mod2 = (F.ORDER - _1n2) / _2n;
  const powered = F.pow(n, p1mod2);
  const yes = F.eql(powered, F.ONE);
  const zero = F.eql(powered, F.ZERO);
  const no = F.eql(powered, F.neg(F.ONE));
  if (!yes && !zero && !no)
    throw new Error("invalid Legendre symbol result");
  return yes ? 1 : zero ? 0 : -1;
}
function nLength(n, nBitLength) {
  if (nBitLength !== void 0)
    anumber2(nBitLength);
  if (n <= _0n2)
    throw new Error("invalid n length: expected positive n, got " + n);
  if (nBitLength !== void 0 && nBitLength < 1)
    throw new Error("invalid n length: expected positive bit length, got " + nBitLength);
  const bits = bitLen(n);
  if (nBitLength !== void 0 && nBitLength < bits)
    throw new Error(`invalid n length: expected nBitLength (${nBitLength}) >= bitLen(n) (${bits})`);
  const _nBitLength = nBitLength !== void 0 ? nBitLength : bits;
  const nByteLength = Math.ceil(_nBitLength / 8);
  return { nBitLength: _nBitLength, nByteLength };
}
var FIELD_SQRT = /* @__PURE__ */ new WeakMap();
var _Field = class {
  ORDER;
  BITS;
  BYTES;
  isLE;
  ZERO = _0n2;
  ONE = _1n2;
  _lengths;
  _mod;
  constructor(ORDER, opts = {}) {
    if (ORDER <= _1n2)
      throw new Error("invalid field: expected ORDER > 1, got " + ORDER);
    let _nbitLength = void 0;
    this.isLE = false;
    if (opts != null && typeof opts === "object") {
      if (typeof opts.BITS === "number")
        _nbitLength = opts.BITS;
      if (typeof opts.sqrt === "function")
        Object.defineProperty(this, "sqrt", { value: opts.sqrt, enumerable: true });
      if (typeof opts.isLE === "boolean")
        this.isLE = opts.isLE;
      if (opts.allowedLengths)
        this._lengths = Object.freeze(opts.allowedLengths.slice());
      if (typeof opts.modFromBytes === "boolean")
        this._mod = opts.modFromBytes;
    }
    const { nBitLength, nByteLength } = nLength(ORDER, _nbitLength);
    if (nByteLength > 2048)
      throw new Error("invalid field: expected ORDER of <= 2048 bytes");
    this.ORDER = ORDER;
    this.BITS = nBitLength;
    this.BYTES = nByteLength;
    Object.freeze(this);
  }
  create(num) {
    return mod(num, this.ORDER);
  }
  isValid(num) {
    if (typeof num !== "bigint")
      throw new TypeError("invalid field element: expected bigint, got " + typeof num);
    return _0n2 <= num && num < this.ORDER;
  }
  is0(num) {
    return num === _0n2;
  }
  // is valid and invertible
  isValidNot0(num) {
    return !this.is0(num) && this.isValid(num);
  }
  isOdd(num) {
    return (num & _1n2) === _1n2;
  }
  neg(num) {
    return mod(-num, this.ORDER);
  }
  eql(lhs, rhs) {
    return lhs === rhs;
  }
  sqr(num) {
    return mod(num * num, this.ORDER);
  }
  add(lhs, rhs) {
    return mod(lhs + rhs, this.ORDER);
  }
  sub(lhs, rhs) {
    return mod(lhs - rhs, this.ORDER);
  }
  mul(lhs, rhs) {
    return mod(lhs * rhs, this.ORDER);
  }
  pow(num, power) {
    return pow(num, power, this.ORDER);
  }
  div(lhs, rhs) {
    return mod(lhs * invert(rhs, this.ORDER), this.ORDER);
  }
  // Same as above, but doesn't normalize
  sqrN(num) {
    return num * num;
  }
  addN(lhs, rhs) {
    return lhs + rhs;
  }
  subN(lhs, rhs) {
    return lhs - rhs;
  }
  mulN(lhs, rhs) {
    return lhs * rhs;
  }
  inv(num) {
    return invert(num, this.ORDER);
  }
  sqrt(num) {
    let sqrt = FIELD_SQRT.get(this);
    if (!sqrt)
      FIELD_SQRT.set(this, sqrt = FpSqrt(this.ORDER));
    return sqrt(this, num);
  }
  toBytes(num) {
    return this.isLE ? numberToBytesLE(num, this.BYTES) : numberToBytesBE(num, this.BYTES);
  }
  fromBytes(bytes, skipValidation = false) {
    abytes2(bytes);
    const { _lengths: allowedLengths, BYTES, isLE, ORDER, _mod: modFromBytes } = this;
    if (allowedLengths) {
      if (bytes.length < 1 || !allowedLengths.includes(bytes.length) || bytes.length > BYTES) {
        throw new Error("Field.fromBytes: expected " + allowedLengths + " bytes, got " + bytes.length);
      }
      const padded = new Uint8Array(BYTES);
      padded.set(bytes, isLE ? 0 : padded.length - bytes.length);
      bytes = padded;
    }
    if (bytes.length !== BYTES)
      throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
    let scalar = isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
    if (modFromBytes)
      scalar = mod(scalar, ORDER);
    if (!skipValidation) {
      if (!this.isValid(scalar))
        throw new Error("invalid field element: outside of range 0..ORDER");
    }
    return scalar;
  }
  // TODO: we don't need it here, move out to separate fn
  invertBatch(lst) {
    return FpInvertBatch(this, lst, true);
  }
  // We can't move this out because Fp6, Fp12 implement it
  // and it's unclear what to return in there.
  cmov(a, b, condition) {
    abool(condition, "condition");
    return condition ? b : a;
  }
};
function Field(ORDER, opts = {}) {
  Object.freeze(_Field.prototype);
  return new _Field(ORDER, opts);
}
function FpSqrtEven(Fp2, elm) {
  validateField(Fp2);
  const F = Fp2;
  if (!F.isOdd)
    throw new Error("Field doesn't have isOdd");
  const root = F.sqrt(elm);
  return F.isOdd(root) ? F.neg(root) : root;
}
function getFieldBytesLength(fieldOrder) {
  if (typeof fieldOrder !== "bigint")
    throw new Error("field order must be bigint");
  if (fieldOrder <= _1n2)
    throw new Error("field order must be greater than 1");
  const bitLength = bitLen(fieldOrder - _1n2);
  return Math.ceil(bitLength / 8);
}
function getMinHashLength(fieldOrder) {
  const length = getFieldBytesLength(fieldOrder);
  return length + Math.ceil(length / 2);
}
function mapHashToField(key, fieldOrder, isLE = false) {
  abytes2(key);
  const len = key.length;
  const fieldLen = getFieldBytesLength(fieldOrder);
  const minLen = Math.max(getMinHashLength(fieldOrder), 16);
  if (len < minLen || len > 1024)
    throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
  const num = isLE ? bytesToNumberLE(key) : bytesToNumberBE(key);
  const reduced = mod(num, fieldOrder - _1n2) + _1n2;
  return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
}

// node_modules/@noble/curves/abstract/curve.js
var _0n3 = /* @__PURE__ */ BigInt(0);
var _1n3 = /* @__PURE__ */ BigInt(1);
var _4n2 = /* @__PURE__ */ BigInt(4);
var BLIND_BYTES = 16;
var BLIND_BITS = 128;
var FW_WINDOW = 5;
var TABLE_BYTES_MAX = /* @__PURE__ */ (() => 2 ** 31)();
function validatePointCons(Point) {
  const pc = Point;
  if (typeof pc !== "function")
    throw new TypeError('"Point" expected constructor, got type=' + typeof Point);
  afunction(pc.fromAffine, "Point.fromAffine");
  afunction(pc.fromBytes, "Point.fromBytes");
  afunction(pc.fromHex, "Point.fromHex");
  aobject2(pc.BASE, "Point.BASE");
  aobject2(pc.ZERO, "Point.ZERO");
  validateField(pc.Fp);
  validateField(pc.Fn);
}
function normalizeZ(c, points) {
  validatePointCons(c);
  validateMSMPoints(points, c);
  const invertedZs = FpInvertBatch(c.Fp, points.map((p) => p.Z));
  return points.map((p, i) => c.fromAffine(p.toAffine(invertedZs[i])));
}
function validateW(W, bits, min = 1) {
  if (!Number.isSafeInteger(W) || W < min || W > bits)
    throw new Error("invalid window size, expected [" + min + ".." + bits + "], got W=" + W);
}
function validateTableBytes(numPoints, fpBytes) {
  const bytes = numPoints * (4 * fpBytes + 128);
  if (bytes > TABLE_BYTES_MAX)
    throw new Error("invalid window size: table would need ~" + Math.ceil(bytes / 2 ** 20) + " MiB, max " + TABLE_BYTES_MAX / 2 ** 20 + " MiB");
}
function probeRandomBytes(randomBytes3, length) {
  if (randomBytes3 === void 0)
    return void 0;
  afunction(randomBytes3, "randomBytes");
  try {
    const probe = randomBytes3(length);
    if (!isBytes2(probe) || probe.length !== length)
      return void 0;
  } catch {
    return void 0;
  }
  return randomBytes3;
}
function validateMSMPoints(points, c) {
  aarray(points, "points");
  points.forEach((p, i) => {
    if (!(p instanceof c))
      throw new Error("invalid point at index " + i);
  });
}
function validateMSMScalars(scalars, field, maxScalar) {
  if (!Array.isArray(scalars))
    throw new Error("array of scalars expected");
  scalars.forEach((s, i) => {
    const ok = maxScalar === void 0 ? field.isValid(s) : isPosBig(s) && s < maxScalar;
    if (!ok)
      throw new Error("invalid scalar at index " + i);
  });
}
var pointWindowSizes = /* @__PURE__ */ new WeakMap();
function getWindowSize(P) {
  return pointWindowSizes.get(P) || 1;
}
function oddMultiples(p, size) {
  const dbl = p.double();
  const t = [p];
  for (let j = 1; j < size; j++)
    t.push(t[j - 1].add(dbl));
  return t;
}
function wnafDigits(n, W) {
  const size = 2 ** W;
  const half = size / 2;
  const mask = BigInt(size - 1);
  const d = [];
  while (n > _0n3) {
    let w = 0;
    if (n & _1n3) {
      w = Number(n & mask);
      if (w >= half)
        w -= size;
      n -= BigInt(w);
    }
    d.push(w);
    n >>= _1n3;
  }
  return d;
}
function signedWindowDigits(n, W, windows) {
  const size = 2 ** W;
  const half = size / 2;
  const mask = BigInt(size - 1);
  const shiftBy = BigInt(W);
  const d = [];
  for (let w = 0; w < windows; w++) {
    let v = Number(n & mask);
    n >>= shiftBy;
    if (v > half) {
      v -= size;
      n += _1n3;
    }
    d.push(v);
  }
  if (n !== _0n3)
    throw new Error("invalid wnaf");
  return d;
}
function wnafWalk(zero, tables, digits) {
  let max = 0;
  for (const d of digits)
    max = Math.max(max, d.length);
  let acc = zero;
  for (let bit = max - 1; bit >= 0; bit--) {
    if (bit !== max - 1)
      acc = acc.double();
    for (let i = 0; i < digits.length; i++) {
      const w = digits[i][bit];
      if (w) {
        const item = tables[i][Math.abs(w) - 1 >> 1];
        acc = acc.add(w < 0 ? item.negate() : item);
      }
    }
  }
  return acc;
}
var ScalarMultiplier = class {
  Point;
  BASE;
  ZERO;
  randomBytes;
  wnafPrecomputes = /* @__PURE__ */ new WeakMap();
  baseCanBeBlinded;
  bits;
  // Parametrized with a given Point class (not individual point)
  constructor(Point, randomBytes3) {
    validatePointCons(Point);
    this.randomBytes = probeRandomBytes(randomBytes3, BLIND_BYTES);
    this.Point = Point;
    this.BASE = Point.BASE;
    this.ZERO = Point.ZERO;
    this.bits = Point.Fn.BITS;
  }
  /**
   * Creates a signed fixed-window wNAF precomputation table: for every window w, the
   * multiples `[1..2^(W−1)]⋅2^(w⋅W)⋅P`, flattened. All doublings are baked into the table,
   * so cached multiplication is additions-only. `windows = ceil(bits/W) + 1`: the extra
   * window absorbs the final carry of signed-digit recoding.
   * For a 256-bit curve and W=6, the table is 44⋅32 = 1408 points.
   * @param point - Point instance
   * @param W - window size
   * @param bits - scalar bitlength the table must cover
   */
  buildWnafTable(point, W, bits) {
    const windows = Math.ceil(bits / W) + 1;
    const half = 2 ** (W - 1);
    const comp = [];
    let base = point;
    for (let w = 0; w < windows; w++) {
      let acc = base;
      for (let i = 0; i < half; i++) {
        comp.push(acc);
        acc = acc.add(base);
      }
      base = comp[comp.length - 1].double();
    }
    return { W, bits, windows, comp };
  }
  /**
   * Implements ec multiplication using precomputed signed fixed-window wNAF tables.
   * Constant-time: fixed window count with one table addition per window — zero digits feed
   * the fake accumulator — and no doublings; the lookup scans the whole window slice.
   * Scalar bounds are validated by the public entry points ({@link ScalarMultiplier.mulCT},
   * {@link ScalarMultiplier.mulCTBlinded}, {@link ScalarMultiplier.mulUnsafe});
   * signedWindowDigits throws if `n` exceeds the table.
   * @returns real and fake (for const-time) points
   */
  wnafCachedCT(precomputes, n) {
    const { W, windows, comp } = precomputes;
    const half = 2 ** (W - 1);
    const digits = signedWindowDigits(n, W, windows);
    let p = this.ZERO;
    let f = this.BASE;
    for (let w = 0; w < windows; w++) {
      const digit = digits[w];
      const start = w * half;
      const idx = Math.abs(digit) - 1;
      let sel = comp[start];
      for (let i = 1; i < half; i++)
        sel = i === idx ? comp[start + i] : sel;
      const neg = sel.negate();
      if (digit === 0)
        f = f.add(comp[start]);
      else
        p = p.add(digit < 0 ? neg : sel);
    }
    return { p, f };
  }
  // Cache key is point identity plus (W, bits); at most two entries exist per point (public-width
  // `Fn.BITS` and blinded `Fn.BITS + BLIND_BITS`). Callers must not reuse the same point with
  // incompatible `transform(...)` layouts and expect a separate cache entry.
  getWnafPrecomputes(W, point, bits, transform) {
    let entries = this.wnafPrecomputes.get(point);
    let comp = entries?.find((entry) => entry.W === W && entry.bits === bits);
    if (!comp) {
      comp = this.buildWnafTable(point, W, bits);
      if (typeof transform === "function")
        comp = { ...comp, comp: transform(comp.comp) };
      if (!entries) {
        entries = [];
        this.wnafPrecomputes.set(point, entries);
      }
      entries.push(comp);
    }
    return comp;
  }
  assertPoint(point) {
    if (!(point instanceof this.Point))
      throw new TypeError('"point" expected Point instance, got type=' + typeof point);
  }
  // Shared prologue of the constant-time entry points. Rejects scalar 0: in key/signature-style
  // callers a zero scalar means broken upstream plumbing, and concrete Points already reject it.
  // Uses inRange instead of Fn.isValidNot0: validateField() only certifies the arithmetic subset.
  validateMulInput(point, scalar) {
    this.assertPoint(point);
    if (!inRange(scalar, _1n3, this.Point.Fn.ORDER))
      throw new Error("invalid scalar");
  }
  // Constant-time dispatch shared by mulCT / mulCTBlinded. Un-precomputed points (W===1, e.g.
  // ECDH peer keys) skip building a throwaway cached table in favor of a small fixed-window
  // multiply. `n` must be < 2^bits.
  runCT(point, n, bits, transform) {
    const W = getWindowSize(point);
    if (W === 1)
      return this.fixedWindowCT(point, n, bits);
    return this.wnafCachedCT(this.getWnafPrecomputes(W, point, bits, transform), n);
  }
  mulCT(point, scalar, transform) {
    this.validateMulInput(point, scalar);
    return this.runCT(point, scalar, this.bits, transform);
  }
  mulCTBlinded(point, scalar, transform) {
    this.validateMulInput(point, scalar);
    if (this.randomBytes === void 0)
      throw new Error("randomBytes is required for scalar blinding");
    const bits = this.Point.Fn.BITS + BLIND_BITS;
    const blind = this.randomBytes(BLIND_BYTES);
    if (!isBytes2(blind) || blind.length !== BLIND_BYTES)
      throw new Error("randomBytes returned invalid byte array");
    blind[0] = blind[0] & 63 | 128;
    const n = scalar + bytesToNumberBE(blind) * this.Point.Fn.ORDER;
    return this.runCT(point, n, bits, transform);
  }
  /**
   * Constant-time multiplication `n*point` for an un-precomputed point, via a small fixed window.
   * A cached wNAF table only pays off when reused; a flat 2^FW_WINDOW table (`size-1` adds) is
   * far cheaper to build for a single use. The point-operation sequence is independent of `n`:
   * build the table, then per window exactly FW_WINDOW doublings, a data-oblivious scan over
   * every table entry, and one addition (adds the identity when the window digit is 0 — never
   * skipped).
   *
   * `n` must be `< 2^bits`. Assumes complete addition (adding the identity costs the same as any
   * add), which holds for the Weierstrass/Edwards point types used here. The table is left in
   * projective form (no normalizeZ): normalizing this small a table costs more than the
   * mixed-add savings it would buy for a single multiply.
   * @returns real point `p`; `f` duplicates it only to match {@link wnafCachedCT}'s return shape
   * (this path needs no fake accumulator — its op-count is already scalar-independent).
   */
  fixedWindowCT(point, n, bits) {
    const W = FW_WINDOW;
    const size = 1 << W;
    const mask = bitMask(W);
    const table = new Array(size);
    table[0] = this.ZERO;
    for (let i = 1; i < size; i++)
      table[i] = table[i - 1].add(point);
    const windows = Math.ceil(bits / W);
    let acc = this.ZERO;
    for (let window = windows - 1; window >= 0; window--) {
      if (window !== windows - 1)
        for (let d = 0; d < W; d++)
          acc = acc.double();
      const digit = Number(n >> BigInt(window * W) & mask);
      let sel = table[0];
      for (let i = 1; i < size; i++)
        sel = i === digit ? table[i] : sel;
      acc = acc.add(sel);
    }
    return { p: acc, f: acc };
  }
  shouldBlind(point, cofactor) {
    if (this.randomBytes === void 0)
      return false;
    if (cofactor === _1n3)
      return true;
    if (point !== this.BASE)
      return false;
    if (this.baseCanBeBlinded === void 0)
      this.baseCanBeBlinded = this.mulUnsafe(this.BASE, this.Point.Fn.ORDER).is0();
    return this.baseCanBeBlinded;
  }
  mulSecret(point, scalar, cofactor, transform) {
    return this.shouldBlind(point, cofactor) ? this.mulCTBlinded(point, scalar, transform) : this.mulCT(point, scalar, transform);
  }
  mulUnsafe(point, scalar, transform) {
    this.assertPoint(point);
    if (!isPosBig(scalar))
      throw new Error("invalid scalar");
    const W = getWindowSize(point);
    if (W === 1 || scalar >= this.Point.Fn.ORDER)
      return mulAddUnsafe(this.Point, [point], [scalar], true);
    const precomputes = this.getWnafPrecomputes(W, point, this.bits, transform);
    return this.wnafCachedCT(precomputes, scalar).p;
  }
  // Remembers the window size used for precomputed wNAF multiplication of the given point
  // and drops any previously built tables. Usually only the base point is precomputed.
  // W=1 resets the point to the un-precomputed (table-less) paths.
  // W is additionally capped so tables stay under ~2 GiB ({@link TABLE_BYTES_MAX}).
  setWindowSize(point, W) {
    this.assertPoint(point);
    validateW(W, this.bits);
    const windows = Math.ceil((this.bits + BLIND_BITS) / W) + 1;
    validateTableBytes(windows * 2 ** (W - 1), this.Point.Fp.BYTES);
    pointWindowSizes.set(point, W);
    this.wnafPrecomputes.delete(point);
  }
  // True when a window size is set: tables themselves are built lazily on first multiply.
  hasWindowSize(point) {
    return getWindowSize(point) !== 1;
  }
};
function mulAddUnsafe(c, points, scalars, allowOversized = false) {
  validatePointCons(c);
  validateMSMPoints(points, c);
  abool(allowOversized, "allowOversized");
  validateMSMScalars(scalars, c.Fn, allowOversized ? c.Fn.ORDER ** _4n2 : void 0);
  if (points.length !== scalars.length)
    throw new Error("arrays of points and scalars must have equal length");
  const tables = points.map((p) => oddMultiples(p, 4));
  const digits = scalars.map((n) => wnafDigits(n, 4));
  return wnafWalk(c.ZERO, tables, digits);
}
function createField(order, field, isLE) {
  if (field) {
    if (field.ORDER !== order)
      throw new Error("Field.ORDER must match order: Fp == p, Fn == n");
    validateField(field);
    return field;
  } else {
    return Field(order, { isLE });
  }
}
function createCurveFields(type, CURVE, curveOpts = {}, FpFnLE) {
  if (type !== "weierstrass" && type !== "edwards")
    throw new Error('expected curve type "weierstrass" or "edwards"');
  if (FpFnLE === void 0)
    FpFnLE = type === "edwards";
  if (!CURVE || typeof CURVE !== "object")
    throw new Error(`expected valid ${type} CURVE object`);
  validateObject(curveOpts);
  for (const p of ["p", "n", "h"]) {
    const val = CURVE[p];
    if (!(isPosBig(val) && val !== _0n3))
      throw new Error(`CURVE.${p} must be positive bigint`);
  }
  const Fp2 = createField(CURVE.p, curveOpts.Fp, FpFnLE);
  const Fn2 = createField(CURVE.n, curveOpts.Fn, FpFnLE);
  const _b = type === "weierstrass" ? "b" : "d";
  const params = ["Gx", "Gy", "a", _b];
  for (const p of params) {
    if (!Fp2.isValid(CURVE[p]))
      throw new Error(`CURVE.${p} must be valid field element of CURVE.Fp`);
  }
  CURVE = Object.freeze(Object.assign({}, CURVE));
  return { CURVE, Fp: Fp2, Fn: Fn2 };
}
function createKeygen(randomSecretKey, getPublicKey) {
  return function keygen(seed) {
    const secretKey = randomSecretKey(seed);
    return { secretKey, publicKey: getPublicKey(secretKey) };
  };
}

// node_modules/@noble/curves/abstract/edwards.js
var _0n4 = /* @__PURE__ */ BigInt(0);
var _1n4 = /* @__PURE__ */ BigInt(1);
var _2n2 = /* @__PURE__ */ BigInt(2);
var _4n3 = /* @__PURE__ */ BigInt(4);
var _8n2 = /* @__PURE__ */ BigInt(8);
function isEdValidXY(Fp2, CURVE, x, y) {
  const x2 = Fp2.sqr(x);
  const y2 = Fp2.sqr(y);
  const left = Fp2.add(Fp2.mul(CURVE.a, x2), y2);
  const right = Fp2.add(Fp2.ONE, Fp2.mul(CURVE.d, Fp2.mul(x2, y2)));
  return Fp2.eql(left, right);
}
function edwards(params, extraOpts = {}) {
  validateObject(extraOpts, {}, {}, "extraOpts");
  const opts = extraOpts;
  const validated = createCurveFields("edwards", params, opts, opts.FpFnLE);
  const { Fp: Fp2, Fn: Fn2 } = validated;
  let CURVE = validated.CURVE;
  const { h: cofactor } = CURVE;
  if (FpLegendre(Fp2, CURVE.a) !== 1)
    throw new Error("edwards: CURVE.a must be a square in Fp for complete addition formulas");
  if (FpLegendre(Fp2, CURVE.d) !== -1)
    throw new Error("edwards: CURVE.d must be a non-square in Fp for complete addition formulas");
  validateObject(opts, {}, { uvRatio: "function", randomBytes: "function" });
  const randomBytes3 = opts.randomBytes === void 0 ? randomBytes2 : opts.randomBytes;
  const MASK = _2n2 << BigInt(Fp2.BYTES * 8) - _1n4;
  function isOdd(n) {
    if (!Fp2.isOdd)
      throw new Error("Field does not have .isOdd()");
    return Fp2.isOdd(n);
  }
  const uvRatio2 = opts.uvRatio === void 0 ? (u, v) => {
    try {
      return { isValid: true, value: Fp2.sqrt(Fp2.div(u, v)) };
    } catch (e) {
      return { isValid: false, value: _0n4 };
    }
  } : opts.uvRatio;
  if (!isEdValidXY(Fp2, CURVE, CURVE.Gx, CURVE.Gy))
    throw new Error("bad curve params: generator point");
  const mulA = Fp2.eql(CURVE.a, Fp2.neg(Fp2.ONE)) ? (x) => Fp2.neg(x) : Fp2.eql(CURVE.a, Fp2.ONE) ? (x) => x : (x) => Fp2.mul(CURVE.a, x);
  function acoord(title, n, banZero = false) {
    const min = banZero ? _1n4 : _0n4;
    aInRange("coordinate " + title, n, min, MASK);
    return n;
  }
  function aedpoint(other) {
    if (!(other instanceof Point))
      throw new Error("EdwardsPoint expected");
  }
  class Point {
    static BASE = new Point(CURVE.Gx, CURVE.Gy, Fp2.ONE, Fp2.mul(CURVE.Gx, CURVE.Gy));
    static ZERO = new Point(Fp2.ZERO, Fp2.ONE, Fp2.ONE, Fp2.ZERO);
    static Fp = Fp2;
    static Fn = Fn2;
    X;
    Y;
    Z;
    T;
    constructor(X, Y, Z, T) {
      this.X = acoord("x", X);
      this.Y = acoord("y", Y);
      this.Z = acoord("z", Z, true);
      this.T = acoord("t", T);
      Object.freeze(this);
    }
    static CURVE() {
      return CURVE;
    }
    /**
     * Create one extended Edwards point from affine coordinates.
     * Does NOT validate that the point is on-curve or torsion-free.
     * Use `.assertValidity()` on adversarial inputs.
     */
    static fromAffine(p) {
      if (p instanceof Point)
        throw new Error("extended point not allowed");
      const { x, y } = p || {};
      acoord("x", x);
      acoord("y", y);
      return new Point(x, y, Fp2.ONE, Fp2.mul(x, y));
    }
    // Uses algo from RFC8032 5.1.3.
    static fromBytes(bytes, zip215 = false) {
      const len = Fp2.BYTES;
      const { a, d } = CURVE;
      bytes = copyBytes(abytes2(bytes, len, "point"));
      abool(zip215, "zip215");
      const normed = copyBytes(bytes);
      const lastByte = bytes[len - 1];
      normed[len - 1] = lastByte & ~128;
      const y = bytesToNumberLE(normed);
      const max = zip215 ? MASK : Fp2.ORDER;
      aInRange("point.y", y, _0n4, max);
      const y2 = Fp2.sqr(y);
      const u = Fp2.sub(y2, Fp2.ONE);
      const v = Fp2.sub(Fp2.mulN(d, y2), a);
      let { isValid, value: x } = uvRatio2(u, v);
      if (!isValid)
        throw new Error("bad point: invalid y coordinate");
      const isXOdd = isOdd(x);
      const isLastByteOdd = (lastByte & 128) !== 0;
      if (!zip215 && Fp2.is0(x) && isLastByteOdd)
        throw new Error("bad point: x=0 and x_0=1");
      if (isLastByteOdd !== isXOdd)
        x = Fp2.neg(x);
      return Point.fromAffine({ x, y });
    }
    static fromHex(hex, zip215 = false) {
      return Point.fromBytes(hexToBytes2(hex), zip215);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    precompute(windowSize = 6, isLazy = true) {
      wnaf.setWindowSize(this, windowSize);
      if (!isLazy)
        this.multiply(_2n2);
      return this;
    }
    // Useful in fromAffine() - not for fromBytes(), which always created valid points.
    assertValidity() {
      const p = this;
      const { a, d } = CURVE;
      if (p.is0())
        throw new Error("bad point: ZERO");
      const { X, Y, Z, T } = p;
      const X2 = Fp2.sqr(X);
      const Y2 = Fp2.sqr(Y);
      const Z2 = Fp2.sqr(Z);
      const Z4 = Fp2.sqr(Z2);
      const aX2 = Fp2.mul(X2, a);
      const left = Fp2.mul(Fp2.add(aX2, Y2), Z2);
      const right = Fp2.add(Z4, Fp2.mul(d, Fp2.mul(X2, Y2)));
      if (!Fp2.eql(left, right))
        throw new Error("bad point: equation left != right (1)");
      const XY = Fp2.mul(X, Y);
      const ZT = Fp2.mul(Z, T);
      if (!Fp2.eql(XY, ZT))
        throw new Error("bad point: equation left != right (2)");
    }
    // Compare one point to another.
    equals(other) {
      aedpoint(other);
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const { X: X2, Y: Y2, Z: Z2 } = other;
      const X1Z2 = Fp2.mul(X1, Z2);
      const X2Z1 = Fp2.mul(X2, Z1);
      const Y1Z2 = Fp2.mul(Y1, Z2);
      const Y2Z1 = Fp2.mul(Y2, Z1);
      return Fp2.eql(X1Z2, X2Z1) && Fp2.eql(Y1Z2, Y2Z1);
    }
    is0() {
      return this.equals(Point.ZERO);
    }
    negate() {
      return new Point(Fp2.neg(this.X), this.Y, this.Z, Fp2.neg(this.T));
    }
    // Fast algo for doubling Extended Point.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
    // Cost: 4M + 4S + 1*a + 6add + 1*2.
    double() {
      const { X: X1, Y: Y1, Z: Z1 } = this;
      const A = Fp2.sqr(X1);
      const B = Fp2.sqr(Y1);
      const C = Fp2.mul(Fp2.sqr(Z1), _2n2);
      const D = mulA(A);
      const x1y1 = Fp2.addN(X1, Y1);
      const E = Fp2.sub(Fp2.subN(Fp2.sqr(x1y1), A), B);
      const G = Fp2.addN(D, B);
      const F = Fp2.subN(G, C);
      const H = Fp2.subN(D, B);
      const X3 = Fp2.mul(E, F);
      const Y3 = Fp2.mul(G, H);
      const T3 = Fp2.mul(E, H);
      const Z3 = Fp2.mul(F, G);
      return new Point(X3, Y3, Z3, T3);
    }
    // Fast algo for adding 2 Extended Points.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
    // Cost: 9M + 1*a + 1*d + 7add.
    add(other) {
      aedpoint(other);
      const { d } = CURVE;
      const { X: X1, Y: Y1, Z: Z1, T: T1 } = this;
      const { X: X2, Y: Y2, Z: Z2, T: T2 } = other;
      const A = Fp2.mul(X1, X2);
      const B = Fp2.mul(Y1, Y2);
      const C = Fp2.mul(Fp2.mulN(T1, d), T2);
      const D = Fp2.mul(Z1, Z2);
      const E = Fp2.sub(Fp2.subN(Fp2.mulN(Fp2.addN(X1, Y1), Fp2.addN(X2, Y2)), A), B);
      const F = Fp2.subN(D, C);
      const G = Fp2.addN(D, C);
      const H = Fp2.sub(B, mulA(A));
      const X3 = Fp2.mul(E, F);
      const Y3 = Fp2.mul(G, H);
      const T3 = Fp2.mul(E, H);
      const Z3 = Fp2.mul(F, G);
      return new Point(X3, Y3, Z3, T3);
    }
    subtract(other) {
      aedpoint(other);
      return this.add(other.negate());
    }
    // Constant-time multiplication.
    multiply(scalar) {
      if (!Fn2.isValidNot0(scalar))
        throw new RangeError("invalid scalar: expected 1 <= sc < curve.n");
      const { p, f } = wnaf.mulSecret(this, scalar, cofactor, normalize);
      return normalize([p, f])[0];
    }
    // Non-constant-time multiplication. Uses double-and-add algorithm.
    // It's faster, but should only be used when you don't care about
    // an exposed private key e.g. sig verification.
    // Keeps the same subgroup-scalar contract: 0 is allowed for public-scalar callers, but
    // n and larger values are rejected instead of being reduced mod n to the identity point.
    multiplyUnsafe(scalar) {
      if (!Fn2.isValid(scalar))
        throw new RangeError("invalid scalar: expected 0 <= sc < curve.n");
      if (scalar === _0n4)
        return Point.ZERO;
      if (this.is0() || scalar === _1n4)
        return this;
      return wnaf.mulUnsafe(this, scalar, normalize);
    }
    // Checks if point is of small order.
    // If you add something to small order point, you will have "dirty"
    // point with torsion component.
    // Clears cofactor and checks if the result is 0.
    isSmallOrder() {
      return this.clearCofactor().is0();
    }
    // Multiplies point by curve order and checks if the result is 0.
    // Returns `false` is the point is dirty.
    isTorsionFree() {
      return wnaf.mulUnsafe(this, CURVE.n).is0();
    }
    // Converts Extended point to default (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    toAffine(invertedZ) {
      const p = this;
      let iz = invertedZ;
      if (iz != null && typeof iz !== "bigint")
        throw new TypeError('"invertedZ" expected bigint, got type=' + typeof iz);
      const { X, Y, Z } = p;
      const is0 = p.is0();
      if (iz == null)
        iz = is0 ? Fp2.create(_8n2) : Fp2.inv(Z);
      const x = Fp2.mul(X, iz);
      const y = Fp2.mul(Y, iz);
      const zz = Fp2.mul(Z, iz);
      if (is0)
        return { x: Fp2.ZERO, y: Fp2.ONE };
      if (!Fp2.eql(zz, Fp2.ONE))
        throw new Error("invZ was invalid");
      return { x, y };
    }
    clearCofactor() {
      if (cofactor === _1n4)
        return this;
      if (cofactor === _2n2)
        return this.double();
      if (cofactor === _4n3)
        return this.double().double();
      if (cofactor === _8n2)
        return this.double().double().double();
      return this.multiplyUnsafe(cofactor);
    }
    toBytes() {
      const { x, y } = this.toAffine();
      const bytes = Fp2.toBytes(y);
      bytes[bytes.length - 1] |= isOdd(x) ? 128 : 0;
      return bytes;
    }
    toHex() {
      return bytesToHex2(this.toBytes());
    }
    toString() {
      return `<Point ${this.is0() ? "ZERO" : this.toHex()}>`;
    }
  }
  const normalize = (points) => normalizeZ(Point, points);
  const wnaf = new ScalarMultiplier(Point, randomBytes3);
  if (wnaf.bits >= 6)
    Point.BASE.precompute(6);
  Object.freeze(Point.prototype);
  Object.freeze(Point);
  return Point;
}
var PrimeEdwardsPoint = class {
  static BASE;
  static ZERO;
  static Fp;
  static Fn;
  ep;
  /**
   * Wrap one internal Edwards representative directly.
   * This is not a canonical encoding boundary: alternate Edwards
   * representatives may still describe the same abstract wrapper element.
   */
  constructor(ep) {
    this.ep = ep;
  }
  // Static methods that must be implemented by subclasses
  static fromBytes(_bytes) {
    notImplemented();
  }
  static fromHex(_hex) {
    notImplemented();
  }
  get x() {
    return this.toAffine().x;
  }
  get y() {
    return this.toAffine().y;
  }
  // Common implementations
  clearCofactor() {
    return this;
  }
  assertValidity() {
    this.ep.assertValidity();
  }
  /**
   * Return affine coordinates of the current internal Edwards representative.
   * This is a convenience helper, not a canonical Ristretto/Decaf encoding.
   * Equal abstract elements may expose different `x` / `y`; use
   * `toBytes()` / `fromBytes()` for canonical roundtrips.
   */
  toAffine(invertedZ) {
    return this.ep.toAffine(invertedZ);
  }
  toHex() {
    return bytesToHex2(this.toBytes());
  }
  toString() {
    return this.toHex();
  }
  isTorsionFree() {
    return true;
  }
  isSmallOrder() {
    return false;
  }
  add(other) {
    this.assertSame(other);
    return this.init(this.ep.add(other.ep));
  }
  subtract(other) {
    this.assertSame(other);
    return this.init(this.ep.subtract(other.ep));
  }
  multiply(scalar) {
    return this.init(this.ep.multiply(scalar));
  }
  multiplyUnsafe(scalar) {
    return this.init(this.ep.multiplyUnsafe(scalar));
  }
  double() {
    return this.init(this.ep.double());
  }
  negate() {
    return this.init(this.ep.negate());
  }
  precompute(windowSize, isLazy) {
    this.ep.precompute(windowSize, isLazy);
    return this;
  }
};
function eddsa(Point, cHash, eddsaOpts = {}) {
  validatePointCons(Point);
  if (typeof cHash !== "function")
    throw new Error('"hash" function param is required');
  const hash = cHash;
  const opts = eddsaOpts;
  validateObject(opts, {}, {
    adjustScalarBytes: "function",
    randomBytes: "function",
    domain: "function",
    prehash: "function",
    zip215: "boolean",
    mapToCurve: "function",
    toMontgomery: "function",
    toMontgomerySecret: "function"
  });
  const { prehash } = opts;
  const { BASE, Fp: Fp2, Fn: Fn2 } = Point;
  const outputLen = hash.outputLen;
  const expectedLen = 2 * Fp2.BYTES;
  if (outputLen !== void 0) {
    asafenumber(outputLen, "hash.outputLen");
    if (outputLen !== expectedLen)
      throw new Error(`hash.outputLen must be ${expectedLen}, got ${outputLen}`);
  }
  const randomBytes3 = opts.randomBytes === void 0 ? randomBytes2 : opts.randomBytes;
  const toMontgomery2 = opts.toMontgomery;
  const toMontgomerySecret2 = opts.toMontgomerySecret;
  const adjustScalarBytes2 = opts.adjustScalarBytes === void 0 ? (bytes) => bytes : opts.adjustScalarBytes;
  const domain = opts.domain === void 0 ? (data, ctx, phflag) => {
    abool(phflag, "phflag");
    if (ctx.length || phflag)
      throw new Error("Contexts/pre-hash are not supported");
    return data;
  } : opts.domain;
  function modN_LE(hash2) {
    return Fn2.create(bytesToNumberLE(hash2));
  }
  function getPrivateScalar(key) {
    const len = lengths.secretKey;
    abytes2(key, lengths.secretKey, "secretKey");
    const hashed = abytes2(hash(key), 2 * len, "hashedSecretKey");
    const head = adjustScalarBytes2(hashed.slice(0, len));
    const prefix = hashed.slice(len, 2 * len);
    const scalar = modN_LE(head);
    return { head, prefix, scalar };
  }
  function getExtendedPublicKey(secretKey) {
    const { head, prefix, scalar } = getPrivateScalar(secretKey);
    const point = BASE.multiply(scalar);
    const pointBytes = point.toBytes();
    return { head, prefix, scalar, point, pointBytes };
  }
  function getPublicKey(secretKey) {
    return getExtendedPublicKey(secretKey).pointBytes;
  }
  function hashDomainToScalar(context = Uint8Array.of(), ...msgs) {
    const msg = concatBytes2(...msgs);
    return modN_LE(hash(domain(msg, abytes2(context, void 0, "context"), !!prehash)));
  }
  function sign(msg, secretKey, options = {}) {
    validateObject(options, {}, {}, "options");
    msg = copyBytes(abytes2(msg, void 0, "message"));
    if (prehash)
      msg = prehash(msg);
    const { prefix, scalar, pointBytes } = getExtendedPublicKey(secretKey);
    const r = hashDomainToScalar(options.context, prefix, msg);
    const R = BASE.multiply(r).toBytes();
    const k = hashDomainToScalar(options.context, R, pointBytes, msg);
    const s = Fn2.create(r + k * scalar);
    if (!Fn2.isValid(s))
      throw new Error("sign failed: invalid s");
    const rs = concatBytes2(R, Fn2.toBytes(s));
    return abytes2(rs, lengths.signature, "result");
  }
  const verifyOpts = {
    zip215: opts.zip215
  };
  function verify(sig, msg, publicKey, options = verifyOpts) {
    validateObject(options);
    const { context } = options;
    const zip215 = options.zip215 === void 0 ? !!verifyOpts.zip215 : options.zip215;
    const len = lengths.signature;
    sig = abytes2(sig, len, "signature");
    msg = abytes2(msg, void 0, "message");
    publicKey = abytes2(publicKey, lengths.publicKey, "publicKey");
    if (zip215 !== void 0)
      abool(zip215, "zip215");
    if (prehash)
      msg = prehash(msg);
    const mid = len / 2;
    const r = sig.subarray(0, mid);
    const s = bytesToNumberLE(sig.subarray(mid, len));
    let A, R, SB;
    try {
      A = Point.fromBytes(publicKey, zip215);
      R = Point.fromBytes(r, zip215);
      SB = BASE.multiplyUnsafe(s);
    } catch (error) {
      return false;
    }
    if (!zip215 && A.isSmallOrder())
      return false;
    const k = hashDomainToScalar(context, r, publicKey, msg);
    const RkA = R.add(A.multiplyUnsafe(k));
    return RkA.subtract(SB).clearCofactor().is0();
  }
  const _size = Fp2.BYTES;
  const lengths = {
    secretKey: _size,
    publicKey: _size,
    signature: 2 * _size,
    seed: _size
  };
  function randomSecretKey(seed) {
    seed = seed === void 0 ? randomBytes3(lengths.seed) : seed;
    return abytes2(seed, lengths.seed, "seed");
  }
  function isValidSecretKey(key) {
    return isBytes2(key) && key.length === lengths.secretKey;
  }
  function isValidPublicKey(key, zip215) {
    try {
      return !!Point.fromBytes(key, zip215 === void 0 ? verifyOpts.zip215 : zip215);
    } catch (error) {
      return false;
    }
  }
  const utils = {
    getExtendedPublicKey,
    randomSecretKey,
    isValidSecretKey,
    isValidPublicKey,
    /** Converts an Edwards public key to a companion Montgomery public key. */
    toMontgomery(publicKey) {
      if (toMontgomery2 === void 0)
        throw new Error("Montgomery conversion is not supported for this curve");
      return toMontgomery2(Point.fromBytes(publicKey));
    },
    toMontgomerySecret(secretKey) {
      if (toMontgomerySecret2 === void 0)
        throw new Error("Montgomery conversion is not supported for this curve");
      return toMontgomerySecret2(secretKey);
    }
  };
  Object.freeze(lengths);
  Object.freeze(utils);
  return Object.freeze({
    keygen: createKeygen(randomSecretKey, getPublicKey),
    getPublicKey,
    sign,
    verify,
    utils,
    Point,
    lengths
  });
}

// node_modules/@noble/curves/abstract/fft.js
function checkU32(n, title = "n") {
  if (typeof n !== "number")
    throw new TypeError(`wrong u32 integer "${title}": expected number, got type=${typeof n}`);
  if (!Number.isSafeInteger(n) || n < 0 || n > 4294967295)
    throw new RangeError(`wrong u32 integer "${title}": expected 0..4294967295, got ${n}`);
  return n;
}
function isPowerOfTwo(x) {
  checkU32(x, "x");
  return (x & x - 1) === 0 && x !== 0;
}
function nextPowerOfTwo(n) {
  checkU32(n);
  if (n <= 1)
    return 1;
  if (n > 2147483648)
    throw new Error("nextPowerOfTwo overflow: result does not fit u32");
  return 1 << log2(n - 1) + 1 >>> 0;
}
function log2(n) {
  checkU32(n);
  return 31 - Math.clz32(n);
}
function poly(field, roots, create, fft, length) {
  validateField(field);
  const F = field;
  const _create = create || ((len, elm) => new Array(len).fill(elm ?? F.ZERO));
  const isPoly = (x) => {
    if (Array.isArray(x))
      return true;
    if (!ArrayBuffer.isView(x))
      return false;
    const v = x;
    return typeof v.length === "number" && typeof v.slice === "function" && typeof v[Symbol.iterator] === "function";
  };
  const checkPoly = (title, value) => {
    if (!isPoly(value))
      throw new TypeError(`"${title}" expected polynomial, got type=${typeof value}`);
  };
  const checkLength = (a, b) => {
    checkPoly("a", a);
    const L = a.length;
    if (b !== void 0) {
      checkPoly("b", b);
      if (b.length !== L)
        throw new Error(`poly: mismatched lengths ${L} vs ${b.length}`);
    }
    if (length !== void 0 && L !== length)
      throw new Error(`poly: expected fixed length ${length}, got ${L}`);
    return L;
  };
  function findOmegaIndex(x, n, brp = false, weights) {
    if (!isPowerOfTwo(n))
      throw new Error("poly.lagrange: expected power of two length, got " + n);
    const omega = weights || (brp ? roots.brp(log2(n)) : roots.roots(log2(n)));
    for (let i = 0; i < n; i++)
      if (F.eql(x, omega[i]))
        return i;
    return -1;
  }
  return {
    roots,
    create: _create,
    length,
    extend: (a, len) => {
      checkLength(a);
      const out = _create(len, F.ZERO);
      for (let i = 0; i < Math.min(a.length, len); i++)
        out[i] = a[i];
      return out;
    },
    degree: (a) => {
      checkLength(a);
      for (let i = a.length - 1; i >= 0; i--)
        if (!F.is0(a[i]))
          return i;
      return -1;
    },
    add: (a, b) => {
      const len = checkLength(a, b);
      const out = _create(len);
      for (let i = 0; i < len; i++)
        out[i] = F.add(a[i], b[i]);
      return out;
    },
    sub: (a, b) => {
      const len = checkLength(a, b);
      const out = _create(len);
      for (let i = 0; i < len; i++)
        out[i] = F.sub(a[i], b[i]);
      return out;
    },
    dot: (a, b) => {
      const len = checkLength(a, b);
      const out = _create(len);
      for (let i = 0; i < len; i++)
        out[i] = F.mul(a[i], b[i]);
      return out;
    },
    mul: (a, b) => {
      if (isPoly(b)) {
        const len = checkLength(a, b);
        if (fft) {
          const A = fft.direct(a, false, true);
          const B = fft.direct(b, false, true);
          for (let i = 0; i < A.length; i++)
            A[i] = F.mul(A[i], B[i]);
          return fft.inverse(A, true, false);
        } else {
          const res = _create(len);
          for (let i = 0; i < len; i++) {
            for (let j = 0; j < len; j++) {
              const k = (i + j) % len;
              res[k] = F.add(res[k], F.mul(a[i], b[j]));
            }
          }
          return res;
        }
      } else {
        const out = _create(checkLength(a));
        for (let i = 0; i < out.length; i++)
          out[i] = F.mul(a[i], b);
        return out;
      }
    },
    convolve(a, b) {
      checkPoly("a", a);
      checkPoly("b", b);
      const len = nextPowerOfTwo(a.length + b.length - 1);
      return this.mul(this.extend(a, len), this.extend(b, len));
    },
    shift(p, factor) {
      checkPoly("p", p);
      const out = _create(p.length);
      if (length !== void 0 && p.length !== length)
        throw new Error(`poly: expected fixed length ${length}, got ${p.length}`);
      if (!p.length)
        return out;
      out[0] = p[0];
      for (let i = 1, power = F.ONE; i < p.length; i++) {
        power = F.mul(power, factor);
        out[i] = F.mul(p[i], power);
      }
      return out;
    },
    clone: (a) => {
      checkLength(a);
      const out = _create(a.length);
      for (let i = 0; i < a.length; i++)
        out[i] = a[i];
      return out;
    },
    eval: (a, basis) => {
      checkLength(a, basis);
      let acc = F.ZERO;
      for (let i = 0; i < a.length; i++)
        acc = F.add(acc, F.mul(a[i], basis[i]));
      return acc;
    },
    monomial: {
      basis: (x, n) => {
        const out = _create(n);
        let pow3 = F.ONE;
        for (let i = 0; i < n; i++) {
          out[i] = pow3;
          pow3 = F.mul(pow3, x);
        }
        return out;
      },
      eval: (a, x) => {
        checkLength(a);
        let acc = F.ZERO;
        for (let i = a.length - 1; i >= 0; i--)
          acc = F.add(F.mul(acc, x), a[i]);
        return acc;
      }
    },
    lagrange: {
      basis: (x, n, brp = false, weights) => {
        if (!isPowerOfTwo(n))
          throw new Error("poly.lagrange: expected power of two length, got " + n);
        const bits = log2(n);
        const cache = weights || (brp ? roots.brp(bits) : roots.roots(bits));
        const out = _create(n);
        const idx = findOmegaIndex(x, n, brp, weights);
        if (idx !== -1) {
          out[idx] = F.ONE;
          return out;
        }
        const tm = F.pow(x, BigInt(n));
        const c = F.mul(F.sub(tm, F.ONE), F.inv(BigInt(n)));
        const denom = _create(n);
        for (let i = 0; i < n; i++)
          denom[i] = F.sub(x, cache[i]);
        const inv = F.invertBatch(denom);
        for (let i = 0; i < n; i++)
          out[i] = F.mul(c, F.mul(cache[i], inv[i]));
        return out;
      },
      eval(a, x, brp = false) {
        checkLength(a);
        const idx = findOmegaIndex(x, a.length, brp);
        if (idx !== -1)
          return a[idx];
        const L = this.basis(x, a.length, brp);
        let acc = F.ZERO;
        for (let i = 0; i < a.length; i++)
          if (!F.is0(a[i]))
            acc = F.add(acc, F.mul(a[i], L[i]));
        return acc;
      }
    },
    vanishing(roots2) {
      checkPoly("roots", roots2);
      if (length !== void 0 && roots2.length !== length)
        throw new Error(`poly: expected fixed length ${length}, got ${roots2.length}`);
      const out = _create(roots2.length + 1, F.ZERO);
      out[0] = F.ONE;
      for (const r of roots2) {
        const neg = F.neg(r);
        for (let j = out.length - 1; j > 0; j--)
          out[j] = F.add(F.mul(out[j], neg), out[j - 1]);
        out[0] = F.mul(out[0], neg);
      }
      return out;
    }
  };
}

// node_modules/@noble/curves/abstract/hash-to-curve.js
var os2ip = bytesToNumberBE;
function i2osp(value, length) {
  asafenumber(value);
  asafenumber(length);
  if (length < 0 || length > 4)
    throw new Error("invalid I2OSP length: " + length);
  if (value < 0 || value > 2 ** (8 * length) - 1)
    throw new Error("invalid I2OSP input: " + value);
  const res = Array.from({ length }).fill(0);
  for (let i = length - 1; i >= 0; i--) {
    res[i] = value & 255;
    value >>>= 8;
  }
  return new Uint8Array(res);
}
function strxor(a, b) {
  const arr = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) {
    arr[i] = a[i] ^ b[i];
  }
  return arr;
}
function normDST(DST) {
  if (!isBytes2(DST) && typeof DST !== "string")
    throw new Error("DST must be Uint8Array or ascii string");
  const dst = typeof DST === "string" ? asciiToBytes(DST) : DST;
  if (dst.length === 0)
    throw new Error("DST must be non-empty");
  return dst;
}
function expand_message_xmd(msg, DST, lenInBytes, H) {
  abytes2(msg);
  asafenumber(lenInBytes);
  if (typeof H !== "function")
    throw new Error("expand_message_xmd: expected hash function");
  asafenumber(H.outputLen, "hash.outputLen");
  asafenumber(H.blockLen, "hash.blockLen");
  DST = normDST(DST);
  if (DST.length > 255)
    DST = H(concatBytes2(asciiToBytes("H2C-OVERSIZE-DST-"), DST));
  const { outputLen: b_in_bytes, blockLen: r_in_bytes } = H;
  const ell = Math.ceil(lenInBytes / b_in_bytes);
  if (lenInBytes > 65535 || ell > 255)
    throw new Error("expand_message_xmd: invalid lenInBytes");
  const DST_prime = concatBytes2(DST, i2osp(DST.length, 1));
  const Z_pad = new Uint8Array(r_in_bytes);
  const l_i_b_str = i2osp(lenInBytes, 2);
  const b = new Array(ell);
  const b_0 = H(concatBytes2(Z_pad, msg, l_i_b_str, i2osp(0, 1), DST_prime));
  b[0] = H(concatBytes2(b_0, i2osp(1, 1), DST_prime));
  for (let i = 1; i < ell; i++) {
    const args = [strxor(b_0, b[i - 1]), i2osp(i + 1, 1), DST_prime];
    b[i] = H(concatBytes2(...args));
  }
  const pseudo_random_bytes = concatBytes2(...b);
  return pseudo_random_bytes.slice(0, lenInBytes);
}
function expand_message_xof(msg, DST, lenInBytes, k, H) {
  abytes2(msg);
  asafenumber(lenInBytes);
  asafenumber(k, "k");
  if (k < 0)
    throw new Error("expand_message_xof: invalid k");
  if (typeof H !== "function")
    throw new Error("expand_message_xof: expected XOF function");
  if (typeof H.create !== "function")
    throw new Error("expand_message_xof: expected XOF create");
  DST = normDST(DST);
  if (lenInBytes < 0 || lenInBytes > 65535)
    throw new Error("expand_message_xof: invalid lenInBytes");
  if (DST.length > 255) {
    const dkLen = Math.ceil(2 * k / 8);
    DST = H.create({ dkLen }).update(asciiToBytes("H2C-OVERSIZE-DST-")).update(DST).digest();
  }
  if (DST.length > 255)
    throw new Error("expand_message_xof: invalid DST");
  return H.create({ dkLen: lenInBytes }).update(msg).update(i2osp(lenInBytes, 2)).update(DST).update(i2osp(DST.length, 1)).digest();
}
function hash_to_field(msg, count, options) {
  validateObject(options, {
    p: "bigint",
    m: "number",
    k: "number",
    hash: "function"
  });
  const { p, k, m, hash, expand, DST } = options;
  asafenumber(hash.outputLen, "valid hash");
  abytes2(msg);
  asafenumber(count);
  asafenumber(m, "m");
  asafenumber(k, "k");
  if (p <= BigInt(1))
    throw new Error("hash_to_field: expected valid field characteristic");
  if (count < 1)
    throw new Error("hash_to_field: expected count >= 1");
  if (m < 1)
    throw new Error("hash_to_field: expected m >= 1");
  if (k < 0)
    throw new Error("hash_to_field: invalid k");
  const log2p = p.toString(2).length;
  const L = Math.ceil((log2p + k) / 8);
  const len_in_bytes = count * m * L;
  let prb;
  if (expand === "xmd") {
    prb = expand_message_xmd(msg, DST, len_in_bytes, hash);
  } else if (expand === "xof") {
    prb = expand_message_xof(msg, DST, len_in_bytes, k, hash);
  } else if (expand === "_internal_pass") {
    prb = msg;
  } else {
    throw new Error('expand must be "xmd" or "xof"');
  }
  const u = new Array(count);
  for (let i = 0; i < count; i++) {
    const e = new Array(m);
    for (let j = 0; j < m; j++) {
      const elm_offset = L * (j + i * m);
      const tv = prb.subarray(elm_offset, elm_offset + L);
      e[j] = mod(os2ip(tv), p);
    }
    u[i] = e;
  }
  return u;
}
var _DST_scalar = "HashToScalar-";
function createHasher2(Point, mapToCurve, defaults) {
  if (typeof mapToCurve !== "function")
    throw new Error("mapToCurve() must be defined");
  validateObject(defaults);
  const snapshot = (src) => Object.freeze({
    ...src,
    DST: isBytes2(src.DST) ? copyBytes(src.DST) : src.DST,
    ...src.encodeDST === void 0 ? {} : { encodeDST: isBytes2(src.encodeDST) ? copyBytes(src.encodeDST) : src.encodeDST }
  });
  const safeDefaults = snapshot(defaults);
  const dstOverride = (options) => options && options.DST !== void 0 ? { DST: options.DST } : void 0;
  function map(num) {
    return Point.fromAffine(mapToCurve(num));
  }
  function clear(initial) {
    const P = initial.clearCofactor();
    if (P.equals(Point.ZERO))
      return Point.ZERO;
    P.assertValidity();
    return P;
  }
  return Object.freeze({
    get defaults() {
      return snapshot(safeDefaults);
    },
    Point,
    hashToCurve(msg, options) {
      const opts = Object.assign({}, safeDefaults, dstOverride(options));
      const u = hash_to_field(msg, 2, opts);
      const u0 = map(u[0]);
      const u1 = map(u[1]);
      return clear(u0.add(u1));
    },
    encodeToCurve(msg, options) {
      const optsDst = safeDefaults.encodeDST === void 0 ? {} : { DST: safeDefaults.encodeDST };
      const opts = Object.assign({}, safeDefaults, optsDst, dstOverride(options));
      const u = hash_to_field(msg, 1, opts);
      const u0 = map(u[0]);
      return clear(u0);
    },
    /** See {@link H2CHasher} */
    mapToCurve(scalars) {
      if (safeDefaults.m === 1) {
        if (typeof scalars !== "bigint")
          throw new Error("expected bigint (m=1)");
        return clear(map([scalars]));
      }
      if (!Array.isArray(scalars))
        throw new Error("expected array of bigints");
      if (scalars.length !== safeDefaults.m)
        throw new Error(`expected array of ${safeDefaults.m} bigints`);
      for (const i of scalars)
        if (typeof i !== "bigint")
          throw new Error("expected array of bigints");
      return clear(map(scalars));
    },
    // hash_to_scalar can produce 0: https://www.rfc-editor.org/errata/eid8393
    // RFC 9380, draft-irtf-cfrg-bbs-signatures-08. Default scalar DST is the shared generic
    // `HashToScalar-` prefix above unless the caller overrides it per invocation.
    hashToScalar(msg, options) {
      const N = Point.Fn.ORDER;
      const opts = Object.assign({}, safeDefaults, { DST: _DST_scalar }, dstOverride(options), {
        p: N,
        m: 1
      });
      return hash_to_field(msg, 1, opts)[0][0];
    }
  });
}

// node_modules/@noble/curves/abstract/frost.js
var validateSigners = (signers, title = "signers") => {
  validateObject(signers, { min: "number", max: "number" }, {}, title);
  asafenumber(signers.min, title + ".min");
  asafenumber(signers.max, title + ".max");
  if (signers.min < 2 || signers.max < 2 || signers.min > signers.max)
    throw new Error("Wrong signers info: min=" + signers.min + " max=" + signers.max);
};
var validateCommitmentsNum = (signers, len) => {
  if (len < signers.min || len > signers.max)
    throw new Error("Wrong number of commitments=" + len);
};
var AggErr = class extends Error {
  // Empty means aggregation failed before per-share verification could attribute a signer.
  cheaters;
  constructor(msg, cheaters) {
    super(msg);
    this.cheaters = cheaters;
  }
};
function createFROST(opts) {
  validateObject(opts, {
    name: "string",
    hash: "function"
  }, {
    hashToScalar: "function",
    validatePoint: "function",
    parsePublicKey: "function",
    adjustScalar: "function",
    adjustPoint: "function",
    challenge: "function",
    adjustNonces: "function",
    adjustSecret: "function",
    adjustPublic: "function",
    adjustGroupCommitmentShare: "function",
    adjustTx: "object",
    adjustDKG: "function"
  });
  validatePointCons(opts.Point);
  const { Point, validatePoint, parsePublicKey, adjustScalar, adjustPoint: adjustPointHook, challenge, adjustNonces, adjustSecret, adjustPublic, adjustGroupCommitmentShare, adjustDKG } = opts;
  const Fn2 = opts.Fn === void 0 ? Point.Fn : opts.Fn;
  const adjustTx = opts.adjustTx === void 0 ? void 0 : { encode: opts.adjustTx.encode, decode: opts.adjustTx.decode };
  if (adjustTx)
    validateObject(adjustTx, { encode: "function", decode: "function" });
  const hashBytes = opts.hash;
  const hashToScalar = opts.hashToScalar === void 0 ? (msg, opts2 = { DST: new Uint8Array() }) => {
    const t = hashBytes(concatBytes2(opts2.DST, msg));
    return Fn2.create(Fn2.isLE ? bytesToNumberLE(t) : bytesToNumberBE(t));
  } : opts.hashToScalar;
  const H1Prefix = utf8ToBytes(opts.H1 !== void 0 ? opts.H1 : opts.name + "rho");
  const H2Prefix = utf8ToBytes(opts.H2 !== void 0 ? opts.H2 : opts.name + "chal");
  const H3Prefix = utf8ToBytes(opts.H3 !== void 0 ? opts.H3 : opts.name + "nonce");
  const H4Prefix = utf8ToBytes(opts.H4 !== void 0 ? opts.H4 : opts.name + "msg");
  const H5Prefix = utf8ToBytes(opts.H5 !== void 0 ? opts.H5 : opts.name + "com");
  const HDKGPrefix = utf8ToBytes(opts.HDKG !== void 0 ? opts.HDKG : opts.name + "dkg");
  const HIDPrefix = utf8ToBytes(opts.HID !== void 0 ? opts.HID : opts.name + "id");
  const H1 = (msg) => hashToScalar(msg, { DST: H1Prefix });
  const H2 = (msg) => hashToScalar(msg, { DST: H2Prefix });
  const H3 = (msg) => hashToScalar(msg, { DST: H3Prefix });
  const H4 = (msg) => hashBytes(concatBytes2(H4Prefix, msg));
  const H5 = (msg) => hashBytes(concatBytes2(H5Prefix, msg));
  const HDKG = (msg) => hashToScalar(msg, { DST: HDKGPrefix });
  const HID = (msg) => hashToScalar(msg, { DST: HIDPrefix });
  const randomScalar = (rng = randomBytes2) => {
    if (typeof rng !== "function")
      throw new TypeError('"rng" expected function, got type=' + typeof rng);
    const t = mapHashToField(rng(getMinHashLength(Fn2.ORDER)), Fn2.ORDER, Fn2.isLE);
    return Fn2.isLE ? bytesToNumberLE(t) : bytesToNumberBE(t);
  };
  const serializePoint = (p) => p.toBytes();
  const validatePublicPoint = (p) => {
    p.assertValidity();
    if (p.is0())
      throw new Error("invalid point: identity");
    if (!p.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    if (validatePoint)
      validatePoint(p);
    return p;
  };
  const parsePoint = (bytes) => validatePublicPoint(Point.fromBytes(bytes));
  const nonceCommitments = (identifier, nonces) => ({
    identifier,
    hiding: serializePoint(Point.BASE.multiply(Fn2.fromBytes(nonces.hiding))),
    binding: serializePoint(Point.BASE.multiply(Fn2.fromBytes(nonces.binding)))
  });
  const adjustPoint = adjustPointHook === void 0 ? (n) => n : adjustPointHook;
  const validateIdentifier = (n) => {
    if (!Fn2.isValid(n) || Fn2.is0(n))
      throw new Error("Invalid identifier " + n);
    return n;
  };
  const serializeIdentifier = (id) => bytesToHex2(Fn2.toBytes(validateIdentifier(id)));
  const parseIdentifier = (id, title = "identifier") => {
    astring(id, title);
    const n = validateIdentifier(Fn2.fromBytes(hexToBytes2(id)));
    if (serializeIdentifier(n) !== id)
      throw new Error("expected canonical identifier hex");
    return n;
  };
  const copyRound1Package = (p) => ({
    identifier: serializeIdentifier(parseIdentifier(p.identifier)),
    commitment: p.commitment.map((c) => copyBytes(c)),
    proofOfKnowledge: copyBytes(p.proofOfKnowledge)
  });
  const canonicalRound1Packages = (packages) => {
    const snapshot = packages.map(copyRound1Package);
    snapshot.sort((a, b) => {
      const ai = parseIdentifier(a.identifier);
      const bi = parseIdentifier(b.identifier);
      return ai < bi ? -1 : ai > bi ? 1 : 0;
    });
    return snapshot;
  };
  const equalRound1Transcripts = (a, b) => {
    if (a.length !== b.length)
      return false;
    for (let i = 0; i < a.length; i++) {
      const p = a[i];
      const q = b[i];
      if (p.identifier !== q.identifier || p.commitment.length !== q.commitment.length)
        return false;
      for (let j = 0; j < p.commitment.length; j++) {
        if (!equalBytes(p.commitment[j], q.commitment[j]))
          return false;
      }
      if (!equalBytes(p.proofOfKnowledge, q.proofOfKnowledge))
        return false;
    }
    return true;
  };
  const Signature = {
    // RFC 9591 Appendix A encodes signatures canonically as
    // SerializeElement(R) || SerializeScalar(z).
    encode: (R, z) => {
      let res = concatBytes2(serializePoint(R), Fn2.toBytes(z));
      if (adjustTx)
        res = adjustTx.encode(res);
      return res;
    },
    decode: (sig) => {
      if (adjustTx)
        sig = adjustTx.decode(sig);
      const Rbytes = sig.subarray(0, -Fn2.BYTES);
      const R = parsePoint(Rbytes);
      if (serializePoint(R).length !== Rbytes.length)
        throw new Error("invalid signature encoding");
      const z = Fn2.fromBytes(sig.subarray(-Fn2.BYTES));
      return { R, z };
    }
  };
  const genPointScalarPair = (rng = randomBytes2) => {
    let n = randomScalar(rng);
    if (adjustScalar)
      n = adjustScalar(n);
    let p = Point.BASE.multiply(n);
    return { scalar: n, point: p };
  };
  const nrErr = "roots are unavailable in FROST polynomial mode";
  const noRoots = {
    info: { G: Fn2.ZERO, oddFactor: Fn2.ZERO, powerOfTwo: 0 },
    roots() {
      throw new Error(nrErr);
    },
    brp() {
      throw new Error(nrErr);
    },
    inverse() {
      throw new Error(nrErr);
    },
    omega() {
      throw new Error(nrErr);
    },
    clear() {
    }
  };
  const Poly = poly(Fn2, noRoots);
  const msm = (points, scalars) => mulAddUnsafe(Point, points, scalars);
  const polynomialEvaluate = (x, coeffs) => {
    if (!coeffs.length)
      throw new Error("empty coefficients");
    return Poly.monomial.eval(coeffs, x);
  };
  const deriveInterpolatingValue = (L, xi) => {
    const err = "invalid parameters";
    if (!L.some((x) => Fn2.eql(x, xi)))
      throw new Error(err);
    const Lset = new Set(L);
    if (Lset.size !== L.length)
      throw new Error(err);
    if (!Lset.has(xi))
      throw new Error(err);
    let num = Fn2.ONE;
    let den = Fn2.ONE;
    for (const x of L) {
      if (Fn2.eql(x, xi))
        continue;
      num = Fn2.mul(num, x);
      den = Fn2.mul(den, Fn2.sub(x, xi));
    }
    return Fn2.div(num, den);
  };
  const evalutateVSS = (identifier, commitment) => {
    const monomial = Poly.monomial.basis(identifier, commitment.length);
    return msm(commitment, monomial);
  };
  const generateSecretPolynomial = (signers, secret, coeffs, rng = randomBytes2) => {
    validateSigners(signers);
    if (secret !== void 0)
      abytes2(secret, Fn2.BYTES, "secret");
    if (coeffs !== void 0)
      aarray(coeffs, "coeffs");
    if (typeof rng !== "function")
      throw new TypeError('"rng" expected function, got type=' + typeof rng);
    const secretScalar = secret === void 0 ? randomScalar(rng) : Fn2.fromBytes(secret);
    if (!coeffs) {
      coeffs = [];
      for (let i = 0; i < signers.min - 1; i++)
        coeffs.push(randomScalar(rng));
    }
    if (coeffs.length !== signers.min - 1)
      throw new Error("wrong coefficients length");
    const coefficients = [secretScalar, ...coeffs];
    const commitment = coefficients.map((i) => Point.BASE.multiply(i));
    return { coefficients, commitment, secret: secretScalar };
  };
  const ProofOfKnowledge = {
    challenge: (id, verKey, R) => HDKG(concatBytes2(Fn2.toBytes(id), serializePoint(verKey), serializePoint(R))),
    compute(id, coefficents, commitments, rng = randomBytes2) {
      if (coefficents.length < 1)
        throw new Error("coefficients should have at least one element");
      const { point: R, scalar: k } = genPointScalarPair(rng);
      const verKey = commitments[0];
      const c = this.challenge(id, verKey, R);
      const mu = Fn2.add(k, Fn2.mul(coefficents[0], c));
      return Signature.encode(R, mu);
    },
    validate(id, commitment, proof) {
      if (commitment.length < 1)
        throw new Error("commitment should have at least one element");
      const { R, z } = Signature.decode(proof);
      const phi = parsePoint(commitment[0]);
      const c = this.challenge(id, phi, R);
      if (!R.equals(Point.BASE.multiplyUnsafe(z).subtract(phi.multiplyUnsafe(c))))
        throw new Error("invalid proof of knowledge");
    }
  };
  const Basic = {
    challenge: (R, PK, msg) => {
      if (challenge)
        return challenge(R, PK, msg);
      return H2(concatBytes2(serializePoint(R), serializePoint(PK), msg));
    },
    sign(msg, sk, rng = randomBytes2) {
      const { point: R, scalar: r } = genPointScalarPair(rng);
      const PK = Point.BASE.multiply(sk);
      const c = this.challenge(R, PK, msg);
      const z = Fn2.add(r, Fn2.mul(c, sk));
      return [R, z];
    },
    verify(msg, R, z, PK) {
      if (adjustPointHook)
        PK = adjustPointHook(PK);
      if (adjustPointHook)
        R = adjustPointHook(R);
      const c = this.challenge(R, PK, msg);
      const zB = Point.BASE.multiplyUnsafe(z);
      const cA = PK.multiplyUnsafe(c);
      let check = zB.subtract(cA).subtract(R);
      if (check.clearCofactor)
        check = check.clearCofactor();
      return Point.ZERO.equals(check);
    }
  };
  const validateSecretShare = (identifier, commitment, signingShare) => {
    if (!Point.BASE.multiply(signingShare).equals(evalutateVSS(identifier, commitment)))
      throw new Error("invalid secret share");
  };
  const Identifier = {
    fromNumber(n) {
      if (!Number.isSafeInteger(n))
        throw new Error("expected safe interger");
      return serializeIdentifier(BigInt(n));
    },
    // Not in spec, but in FROST implementation,
    // seems useful and nice, no need to sync identifiers (would require more interactions)
    derive(s) {
      astring(s, "s");
      return serializeIdentifier(HID(utf8ToBytes(s)));
    }
  };
  const generateNonce = (secret, rng = randomBytes2) => H3(concatBytes2(rng(32), Fn2.toBytes(secret)));
  const getGroupCommitment = (GPK, commitmentList, msg) => {
    const CL = commitmentList.map((i) => [
      i.identifier,
      parseIdentifier(i.identifier),
      parsePoint(i.hiding),
      parsePoint(i.binding)
    ]);
    CL.sort((a, b) => a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0);
    const Cbytes = [];
    for (const [_, id, hC, bC] of CL)
      Cbytes.push(Fn2.toBytes(id), serializePoint(hC), serializePoint(bC));
    const encodedCommitmentHash = H5(concatBytes2(...Cbytes));
    const rhoPrefix = concatBytes2(serializePoint(GPK), H4(msg), encodedCommitmentHash);
    const bindingFactors = {};
    for (const [i, id] of CL) {
      bindingFactors[i] = H1(concatBytes2(rhoPrefix, Fn2.toBytes(id)));
    }
    let hidingSum = Point.ZERO;
    const points = [];
    const scalars = [];
    for (const [i, _, hC, bC] of CL) {
      if (Point.ZERO.equals(hC) || Point.ZERO.equals(bC))
        throw new Error("infinity commitment");
      hidingSum = hidingSum.add(hC);
      points.push(bC);
      scalars.push(bindingFactors[i]);
    }
    const groupCommitment = hidingSum.add(msm(points, scalars));
    const identifiers = CL.map((i) => i[1]);
    return { identifiers, groupCommitment, bindingFactors };
  };
  const prepareShare = (PK, commitmentList, msg, identifier) => {
    const GPK = adjustPoint(parsePoint(PK));
    const id = parseIdentifier(identifier);
    const { identifiers, groupCommitment, bindingFactors } = getGroupCommitment(GPK, commitmentList, msg);
    const bindingFactor = bindingFactors[identifier];
    const lambda = deriveInterpolatingValue(identifiers, id);
    const challenge2 = Basic.challenge(groupCommitment, GPK, msg);
    return { lambda, challenge: challenge2, bindingFactor, groupCommitment };
  };
  Object.freeze(Identifier);
  const frost = {
    Identifier,
    // DKG is Distributed Key Generation, not Trusted Dealer Key Generation.
    DKG: Object.freeze({
      // NOTE: we allow to pass secret scalar from user side,
      // this way it can be derived, instead of random generation
      round1: (id, signers, secret, rng = randomBytes2) => {
        const idNum = parseIdentifier(id, "id");
        validateSigners(signers);
        const { coefficients, commitment } = generateSecretPolynomial(signers, secret, void 0, rng);
        const proofOfKnowledge = ProofOfKnowledge.compute(idNum, coefficients, commitment, rng);
        const commitmentBytes = commitment.map(serializePoint);
        const round1Public = {
          identifier: serializeIdentifier(idNum),
          commitment: commitmentBytes,
          proofOfKnowledge
        };
        const round1Secret = {
          identifier: idNum,
          coefficients,
          commitment: commitment.map(serializePoint),
          // Copy threshold metadata instead of retaining the caller-owned object by reference.
          signers: { min: signers.min, max: signers.max },
          step: 1
        };
        return { public: round1Public, secret: round1Secret };
      },
      round2: (secret, others) => {
        validateObject(secret, { identifier: "bigint", commitment: "object", signers: "object" }, { coefficients: "object", round1Cache: "object", round2Cache: "object", step: "number" }, "secret");
        validateSigners(secret.signers, "secret.signers");
        aarray(others, "others");
        if (others.length !== secret.signers.max - 1)
          throw new Error("wrong number of round1 packages");
        if (!secret.coefficients || secret.step === 3)
          throw new Error("round3 package used in round2");
        const authenticatedRound1 = canonicalRound1Packages(others);
        if (secret.round2Cache !== void 0) {
          if (secret.round1Cache === void 0 || !equalRound1Transcripts(secret.round1Cache, authenticatedRound1))
            throw new Error("round1 packages do not match authenticated transcript");
          return secret.round2Cache;
        }
        const res = {};
        for (const p of authenticatedRound1) {
          if (p.commitment.length !== secret.signers.min)
            throw new Error("wrong number of commitments");
          const id = parseIdentifier(p.identifier);
          if (id === secret.identifier)
            throw new Error("duplicate id=" + serializeIdentifier(id));
          ProofOfKnowledge.validate(id, p.commitment, p.proofOfKnowledge);
          for (const c of p.commitment)
            parsePoint(c);
          if (res[p.identifier])
            throw new Error("Duplicate id=" + id);
          const signingShare = Fn2.toBytes(polynomialEvaluate(id, secret.coefficients));
          res[p.identifier] = {
            identifier: serializeIdentifier(secret.identifier),
            signingShare
          };
        }
        secret.round1Cache = authenticatedRound1;
        secret.round2Cache = res;
        secret.step = 2;
        return res;
      },
      round3: (secret, round1, round2) => {
        validateObject(secret, { identifier: "bigint", commitment: "object", signers: "object" }, { coefficients: "object", round1Cache: "object", round2Cache: "object", step: "number" }, "secret");
        validateSigners(secret.signers, "secret.signers");
        aarray(round1, "round1");
        aarray(round2, "round2");
        if (round1.length !== secret.signers.max - 1)
          throw new Error("wrong length of round1 packages");
        if (!secret.coefficients || secret.step !== 2 || !secret.round1Cache)
          throw new Error("round2 package used in round3");
        const suppliedRound1 = canonicalRound1Packages(round1);
        const authenticatedRound1 = secret.round1Cache;
        if (!equalRound1Transcripts(authenticatedRound1, suppliedRound1))
          throw new Error("round1 packages do not match authenticated transcript");
        if (round2.length !== authenticatedRound1.length)
          throw new Error("wrong length of round2 packages");
        const merged = {};
        for (const r1 of authenticatedRound1) {
          if (!r1.identifier || !r1.commitment)
            throw new Error("wrong round1 share");
          merged[r1.identifier] = { ...r1 };
        }
        for (const r2 of round2) {
          if (!r2.identifier || !r2.signingShare)
            throw new Error("wrong round2 share");
          if (!merged[r2.identifier])
            throw new Error("round1 share for " + r2.identifier + " is missing");
          merged[r2.identifier].signingShare = r2.signingShare;
        }
        if (Object.keys(merged).length !== authenticatedRound1.length)
          throw new Error("mismatch identifiers between rounds");
        let signingShare = Fn2.ZERO;
        if (secret.commitment.length !== secret.signers.min)
          throw new Error("wrong commitments length");
        const localCommitment = secret.commitment.map(parsePoint);
        const localShare = polynomialEvaluate(secret.identifier, secret.coefficients);
        validateSecretShare(secret.identifier, localCommitment, localShare);
        const localCommitmentBytes = localCommitment.map(serializePoint);
        const commitments = {
          [serializeIdentifier(secret.identifier)]: localCommitmentBytes
        };
        for (const k in merged) {
          const v = merged[k];
          if (!v.signingShare || !v.commitment)
            throw new Error("mismatch identifiers");
          const id = parseIdentifier(k);
          const signingSharePart = Fn2.fromBytes(v.signingShare);
          const commitment = v.commitment.map(parsePoint);
          validateSecretShare(secret.identifier, commitment, signingSharePart);
          signingShare = Fn2.add(signingShare, signingSharePart);
          const idSer = serializeIdentifier(id);
          if (commitments[idSer])
            throw new Error("duplicated id=" + idSer);
          commitments[idSer] = v.commitment;
        }
        signingShare = Fn2.add(signingShare, localShare);
        const mergedCommitment = new Array(secret.signers.min).fill(Point.ZERO);
        for (const k in commitments) {
          const v = commitments[k];
          if (v.length !== secret.signers.min)
            throw new Error("wrong commitments length");
          for (let i = 0; i < v.length; i++)
            mergedCommitment[i] = mergedCommitment[i].add(parsePoint(v[i]));
        }
        const mergedCommitmentBytes = mergedCommitment.map(serializePoint);
        const verifyingShares = {};
        for (const k in commitments)
          verifyingShares[k] = serializePoint(evalutateVSS(parseIdentifier(k), mergedCommitment));
        let res = {
          public: {
            signers: { min: secret.signers.min, max: secret.signers.max },
            commitments: mergedCommitmentBytes,
            verifyingShares: Object.fromEntries(Object.entries(verifyingShares).map(([k, v]) => [k, v.slice()]))
          },
          secret: {
            identifier: serializeIdentifier(secret.identifier),
            signingShare: Fn2.toBytes(signingShare)
          }
        };
        if (adjustDKG)
          res = adjustDKG(res);
        for (let i = 0; i < secret.coefficients.length; i++)
          secret.coefficients[i] -= secret.coefficients[i];
        delete secret.coefficients;
        delete secret.round1Cache;
        delete secret.round2Cache;
        secret.step = 3;
        return res;
      },
      clean(secret) {
        validateObject(secret, { identifier: "bigint", commitment: "object", signers: "object" }, { coefficients: "object", round1Cache: "object", round2Cache: "object", step: "number" }, "secret");
        secret.identifier -= secret.identifier;
        if (secret.coefficients) {
          for (let i = 0; i < secret.coefficients.length; i++)
            secret.coefficients[i] -= secret.coefficients[i];
        }
        delete secret.round1Cache;
        delete secret.round2Cache;
        secret.step = 3;
      }
    }),
    // Trusted dealer setup
    // Generates keys for all participants
    trustedDealer(signers, identifiers, secret, rng = randomBytes2) {
      validateSigners(signers);
      if (identifiers === void 0) {
        identifiers = [];
        for (let i = 1; i <= signers.max; i++)
          identifiers.push(Identifier.fromNumber(i));
      } else {
        aarray(identifiers, "identifiers");
        if (identifiers.length !== signers.max)
          throw new Error("identifiers should be array of " + signers.max);
      }
      const identifierNums = {};
      for (const id of identifiers) {
        const idNum = parseIdentifier(id);
        if (id in identifierNums)
          throw new Error("duplicated id=" + id);
        identifierNums[id] = idNum;
      }
      const sp = generateSecretPolynomial(signers, secret, void 0, rng);
      const commitmentBytes = sp.commitment.map(serializePoint);
      const secretShares = {};
      const verifyingShares = {};
      for (const id of identifiers) {
        const signingShare = polynomialEvaluate(identifierNums[id], sp.coefficients);
        verifyingShares[id] = serializePoint(Point.BASE.multiply(signingShare));
        secretShares[id] = {
          identifier: id,
          signingShare: Fn2.toBytes(signingShare)
        };
      }
      return {
        public: {
          signers: { min: signers.min, max: signers.max },
          commitments: commitmentBytes,
          verifyingShares
        },
        secretShares
      };
    },
    // Validate secret (from trusted dealer or DKG)
    validateSecret(secret, pub) {
      validateObject(secret, { identifier: "string", signingShare: "object" }, {}, "secret");
      abytes2(secret.signingShare, Fn2.BYTES, "secret.signingShare");
      validateObject(pub, {
        signers: "object",
        commitments: "object",
        verifyingShares: "object"
      }, {}, "pub");
      validateSigners(pub.signers, "pub.signers");
      aarray(pub.commitments, "pub.commitments");
      const id = parseIdentifier(secret.identifier);
      const commitment = pub.commitments.map(parsePoint);
      const signingShare = Fn2.fromBytes(secret.signingShare);
      validateSecretShare(id, commitment, signingShare);
    },
    // Actual signing
    // Round 1: each participant commit to nonces
    // Nonces kept private, commitments sent to coordinator (or every other participant)
    // NOTE: we don't need the message at this point, which lets a coordinator
    // keep multiple nonce commitments per participant in advance and skip
    // round1 for signing.
    // But then each participant needs to remember generated shares
    commit(secret, rng = randomBytes2) {
      validateObject(secret, { identifier: "string", signingShare: "object" }, {}, "secret");
      abytes2(secret.signingShare, Fn2.BYTES, "secret.signingShare");
      if (typeof rng !== "function")
        throw new TypeError('"rng" expected function, got type=' + typeof rng);
      const secretScalar = Fn2.fromBytes(secret.signingShare);
      const hiding = generateNonce(secretScalar, rng);
      const binding = generateNonce(secretScalar, rng);
      const nonces = { hiding: Fn2.toBytes(hiding), binding: Fn2.toBytes(binding) };
      return { nonces, commitments: nonceCommitments(secret.identifier, nonces) };
    },
    // Round2: sign. Each participant creates a signature share from the secret
    // and the selected nonce commitments.
    signShare(secret, pub, nonces, commitmentList, msg) {
      validateObject(secret, { identifier: "string", signingShare: "object" }, {}, "secret");
      abytes2(secret.signingShare, Fn2.BYTES, "secret.signingShare");
      validateObject(pub, {
        signers: "object",
        commitments: "object",
        verifyingShares: "object"
      }, {}, "pub");
      validateSigners(pub.signers, "pub.signers");
      aarray(pub.commitments, "pub.commitments");
      validateObject(nonces, { hiding: "object", binding: "object" }, {}, "nonces");
      abytes2(nonces.hiding, Fn2.BYTES, "nonces.hiding");
      abytes2(nonces.binding, Fn2.BYTES, "nonces.binding");
      aarray(commitmentList, "commitmentList");
      abytes2(msg, void 0, "msg");
      validateCommitmentsNum(pub.signers, commitmentList.length);
      const hidingNonce0 = Fn2.fromBytes(nonces.hiding);
      const bindingNonce0 = Fn2.fromBytes(nonces.binding);
      if (Fn2.is0(hidingNonce0) || Fn2.is0(bindingNonce0))
        throw new Error("signing nonces already used");
      const expectedCommitment = {
        identifier: secret.identifier,
        hiding: serializePoint(Point.BASE.multiply(hidingNonce0)),
        binding: serializePoint(Point.BASE.multiply(bindingNonce0))
      };
      const commitment = commitmentList.find((i) => i.identifier === secret.identifier);
      if (!commitment)
        throw new Error("missing signer commitment");
      if (bytesToHex2(commitment.hiding) !== bytesToHex2(expectedCommitment.hiding) || bytesToHex2(commitment.binding) !== bytesToHex2(expectedCommitment.binding))
        throw new Error("incorrect signer commitment");
      if (adjustSecret)
        secret = adjustSecret(secret, pub);
      if (adjustPublic)
        pub = adjustPublic(pub);
      const SK = Fn2.fromBytes(secret.signingShare);
      const { lambda, challenge: challenge2, bindingFactor, groupCommitment } = prepareShare(pub.commitments[0], commitmentList, msg, secret.identifier);
      const N = adjustNonces ? adjustNonces(groupCommitment, nonces) : nonces;
      const hidingNonce = adjustNonces ? Fn2.fromBytes(N.hiding) : hidingNonce0;
      const bindingNonce = adjustNonces ? Fn2.fromBytes(N.binding) : bindingNonce0;
      const t = Fn2.mul(Fn2.mul(lambda, SK), challenge2);
      const t2 = Fn2.mul(bindingNonce, bindingFactor);
      const r = Fn2.toBytes(Fn2.add(Fn2.add(hidingNonce, t2), t));
      nonces.hiding.fill(0);
      nonces.binding.fill(0);
      return r;
    },
    // Each participant (or coordinator) can verify signatures from other participants
    verifyShare(pub, commitmentList, msg, identifier, sigShare) {
      validateObject(pub, {
        signers: "object",
        commitments: "object",
        verifyingShares: "object"
      }, {}, "pub");
      validateSigners(pub.signers, "pub.signers");
      aarray(pub.commitments, "pub.commitments");
      aarray(commitmentList, "commitmentList");
      abytes2(msg, void 0, "msg");
      parseIdentifier(identifier);
      abytes2(sigShare, Fn2.BYTES, "sigShare");
      if (adjustPublic)
        pub = adjustPublic(pub);
      const comm = commitmentList.find((i) => i.identifier === identifier);
      if (!comm)
        throw new Error("cannot find identifier commitment");
      const PK = parsePoint(pub.verifyingShares[identifier]);
      const hidingNonceCommitment = parsePoint(comm.hiding);
      const bindingNonceCommitment = parsePoint(comm.binding);
      const { lambda, challenge: challenge2, bindingFactor, groupCommitment } = prepareShare(pub.commitments[0], commitmentList, msg, identifier);
      let commShare = hidingNonceCommitment.add(bindingNonceCommitment.multiplyUnsafe(bindingFactor));
      if (adjustGroupCommitmentShare)
        commShare = adjustGroupCommitmentShare(groupCommitment, commShare);
      const l = Point.BASE.multiplyUnsafe(Fn2.fromBytes(sigShare));
      const r = commShare.add(PK.multiplyUnsafe(Fn2.mul(challenge2, lambda)));
      return l.equals(r);
    },
    // Aggregate multiple signature shares into groupSignature
    aggregate(pub, commitmentList, msg, sigShares) {
      validateObject(pub, {
        signers: "object",
        commitments: "object",
        verifyingShares: "object"
      }, {}, "pub");
      validateSigners(pub.signers, "pub.signers");
      aarray(pub.commitments, "pub.commitments");
      aarray(commitmentList, "commitmentList");
      abytes2(msg, void 0, "msg");
      validateObject(sigShares, {}, {}, "sigShares");
      const rawPub = pub;
      if (adjustPublic)
        pub = adjustPublic(pub);
      try {
        validateCommitmentsNum(pub.signers, commitmentList.length);
      } catch {
        throw new AggErr("aggregation failed", []);
      }
      const ids = commitmentList.map((i) => i.identifier);
      const seen = /* @__PURE__ */ new Set();
      for (const id of ids) {
        if (seen.has(id))
          throw new AggErr("aggregation failed", []);
        seen.add(id);
      }
      if (ids.length !== Object.keys(sigShares).length)
        throw new AggErr("aggregation failed", []);
      for (const id of ids) {
        if (!(id in sigShares) || !(id in pub.verifyingShares))
          throw new AggErr("aggregation failed", []);
      }
      const GPK = parsePoint(pub.commitments[0]);
      const { groupCommitment } = getGroupCommitment(GPK, commitmentList, msg);
      let z = Fn2.ZERO;
      for (const id of ids)
        z = Fn2.add(z, Fn2.fromBytes(sigShares[id]));
      if (!Basic.verify(msg, groupCommitment, z, GPK)) {
        const cheaters = [];
        for (const id of ids) {
          if (!this.verifyShare(rawPub, commitmentList, msg, id, sigShares[id]))
            cheaters.push(id);
        }
        throw new AggErr("aggregation failed", cheaters);
      }
      return Signature.encode(groupCommitment, z);
    },
    // Basic sign/verify using single key
    sign(msg, secretKey) {
      let sk = Fn2.fromBytes(secretKey);
      if (adjustScalar)
        sk = adjustScalar(sk);
      const [R, z] = Basic.sign(msg, sk);
      return Signature.encode(R, z);
    },
    verify(sig, msg, publicKey) {
      const PK = parsePublicKey ? validatePublicPoint(parsePublicKey(publicKey)) : parsePoint(publicKey);
      const { R, z } = Signature.decode(sig);
      return Basic.verify(msg, R, z, PK);
    },
    // Combine multiple secret shares to restore secret
    combineSecret(shares, signers) {
      aarray(shares, "shares");
      validateSigners(signers);
      if (shares.length < signers.min || shares.length > signers.max)
        throw new Error("wrong secret shares array");
      const points = [];
      const seen = {};
      for (const s of shares) {
        const idNum = parseIdentifier(s.identifier);
        const id = serializeIdentifier(idNum);
        if (seen[id])
          throw new Error("duplicated id=" + id);
        seen[id] = true;
        points.push([idNum, Fn2.fromBytes(s.signingShare)]);
      }
      const xCoords = points.map(([x]) => x);
      let res = Fn2.ZERO;
      for (const [x, y] of points)
        res = Fn2.add(res, Fn2.mul(y, deriveInterpolatingValue(xCoords, x)));
      return Fn2.toBytes(res);
    },
    // Utils
    utils: Object.freeze({
      Fn: Fn2,
      // NOTE: we re-export it here because it may be different from Point.Fn (ed448 is fun!)
      // Test RNG overrides still go through noble's non-zero scalar derivation; this is not a raw
      // "bytes become scalar" escape hatch.
      randomScalar: (rng = randomBytes2) => Fn2.toBytes(genPointScalarPair(rng).scalar),
      generateSecretPolynomial: (signers, secret, coeffs, rng) => {
        const res = generateSecretPolynomial(signers, secret, coeffs, rng);
        return { ...res, commitment: res.commitment.map(serializePoint) };
      }
    })
  };
  return Object.freeze(frost);
}

// node_modules/@noble/curves/abstract/montgomery.js
var _0n5 = /* @__PURE__ */ BigInt(0);
var _1n5 = /* @__PURE__ */ BigInt(1);
var _2n3 = /* @__PURE__ */ BigInt(2);
function cmask(P, swap) {
  return P + swap - (swap >> _1n5 << _1n5);
}
function cswap(P) {
  const offset = BigInt(6) * P;
  return (mask, x_2, x_3) => {
    const sum = x_2 + x_3;
    const d = offset + x_3 - x_2;
    const a = (d * mask + x_2) % P;
    return { x_2: a, x_3: sum - a };
  };
}
function validateOpts(curve) {
  validateObject(curve, {
    P: "bigint",
    type: "string",
    adjustScalarBytes: "function",
    powPminus2: "function"
  }, {
    randomBytes: "function",
    scalarMultBase: "function"
  });
  return Object.freeze({ ...curve });
}
function montgomery(curveDef) {
  const CURVE = validateOpts(curveDef);
  const { P, type, adjustScalarBytes: adjustScalarBytes2, powPminus2, randomBytes: rand } = CURVE;
  const mulBaseHook = CURVE.scalarMultBase;
  const is25519 = type === "x25519";
  if (!is25519 && type !== "x448")
    throw new Error("invalid type");
  const randomBytes_ = rand === void 0 ? randomBytes2 : rand;
  const montgomeryBits = is25519 ? 255 : 448;
  const swap = cswap(P);
  const fieldLen = is25519 ? 32 : 56;
  const Gu = is25519 ? BigInt(9) : BigInt(5);
  const a24 = is25519 ? BigInt(121665) : BigInt(39081);
  const minScalar = is25519 ? _2n3 ** BigInt(254) : _2n3 ** BigInt(447);
  const maxAdded = is25519 ? BigInt(8) * (_2n3 ** BigInt(251) - _1n5) : BigInt(4) * (_2n3 ** BigInt(445) - _1n5);
  const maxScalar = minScalar + maxAdded + _1n5;
  const modP = (n) => mod(n, P);
  const GuBytes = encodeU(Gu);
  function encodeU(u) {
    return numberToBytesLE(modP(u), fieldLen);
  }
  function decodeU(u) {
    const _u = copyBytes(abytes2(u, fieldLen, "uCoordinate"));
    if (is25519)
      _u[31] &= 127;
    return modP(bytesToNumberLE(_u));
  }
  function decodeScalar(scalar) {
    return bytesToNumberLE(adjustScalarBytes2(copyBytes(abytes2(scalar, fieldLen, "scalar"))));
  }
  const lowOrderU = new Set(is25519 ? [
    _0n5,
    _1n5,
    P - _1n5,
    BigInt("325606250916557431795983626356110631294008115727848805560023387167927233504"),
    BigInt("39382357235489614581723060781553021112529911719440698176882885853963445705823")
  ] : [_0n5, _1n5, P - _1n5]);
  function scalarMult(scalar, u) {
    const pointU = decodeU(u);
    if (lowOrderU.has(pointU))
      throw new Error("invalid private or public key received");
    const pu = montgomeryLadder(pointU, decodeScalar(scalar));
    if (pu === _0n5)
      throw new Error("invalid private or public key received");
    return encodeU(pu);
  }
  function scalarMultBase(scalar) {
    if (mulBaseHook === void 0)
      return scalarMult(scalar, GuBytes);
    const k = decodeScalar(scalar);
    aInRange("scalar", k, minScalar, maxScalar);
    const pu = modP(mulBaseHook(k));
    if (pu === _0n5)
      throw new Error("invalid private or public key received");
    return encodeU(pu);
  }
  const getPublicKey = scalarMultBase;
  const getSharedSecret = scalarMult;
  function montgomeryLadder(u, scalar) {
    aInRange("u", u, _0n5, P);
    aInRange("scalar", scalar, minScalar, maxScalar);
    const k = scalar;
    const x_1 = u;
    let x_2 = _1n5;
    let z_2 = _0n5;
    let x_3 = u;
    let z_3 = _1n5;
    const kx = k ^ k >> _1n5;
    for (let t = BigInt(montgomeryBits - 1); t >= _0n5; t--) {
      const mask2 = cmask(P, kx >> t);
      ({ x_2, x_3 } = swap(mask2, x_2, x_3));
      ({ x_2: z_2, x_3: z_3 } = swap(mask2, z_2, z_3));
      const A = x_2 + z_2;
      const AA = modP(A * A);
      const B = x_2 - z_2;
      const BB = modP(B * B);
      const E = AA - BB;
      const C = x_3 + z_3;
      const D = x_3 - z_3;
      const DA = modP(D * A);
      const CB = modP(C * B);
      const dacb = DA + CB;
      const da_cb = DA - CB;
      x_3 = modP(dacb * dacb);
      z_3 = modP(x_1 * modP(da_cb * da_cb));
      x_2 = modP(AA * BB);
      z_2 = modP(E * (AA + modP(a24 * E)));
    }
    const mask = cmask(P, k);
    ({ x_2, x_3 } = swap(mask, x_2, x_3));
    ({ x_2: z_2, x_3: z_3 } = swap(mask, z_2, z_3));
    const z2 = powPminus2(z_2);
    return modP(x_2 * z2);
  }
  const lengths = {
    secretKey: fieldLen,
    publicKey: fieldLen,
    seed: fieldLen
  };
  const randomSecretKey = (seed) => {
    seed = seed === void 0 ? randomBytes_(fieldLen) : seed;
    abytes2(seed, lengths.seed, "seed");
    return seed;
  };
  const utils = { randomSecretKey };
  Object.freeze(lengths);
  Object.freeze(utils);
  return Object.freeze({
    keygen: createKeygen(randomSecretKey, getPublicKey),
    getSharedSecret,
    getPublicKey,
    scalarMult,
    scalarMultBase,
    utils,
    GuBytes: GuBytes.slice(),
    lengths
  });
}

// node_modules/@noble/curves/abstract/oprf.js
var _DST_scalarBytes = /* @__PURE__ */ asciiToBytes(_DST_scalar);
function createOPRF(opts) {
  validateObject(opts, {
    name: "string",
    hash: "function",
    hashToScalar: "function",
    hashToGroup: "function"
  });
  validatePointCons(opts.Point);
  const { name, Point, hash, hashToGroup: hashToGroupHook, hashToScalar } = opts;
  const { Fn: Fn2 } = Point;
  const invertSecret = (value) => invertCt(value, Fn2.ORDER);
  const hashToGroup = (msg, ctx) => hashToGroupHook(msg, {
    DST: concatBytes2(asciiToBytes("HashToGroup-"), ctx)
  });
  const hashToScalarPrefixed = (msg, ctx) => hashToScalar(msg, { DST: concatBytes2(_DST_scalarBytes, ctx) });
  const randomScalar = (rng = randomBytes2) => {
    if (typeof rng !== "function")
      throw new TypeError('"rng" expected function, got type=' + typeof rng);
    const t = mapHashToField(rng(getMinHashLength(Fn2.ORDER)), Fn2.ORDER, Fn2.isLE);
    return Fn2.isLE ? bytesToNumberLE(t) : bytesToNumberBE(t);
  };
  const msm = (points, scalars) => mulAddUnsafe(Point, points, scalars);
  const getCtx = (mode) => concatBytes2(asciiToBytes("OPRFV1-"), new Uint8Array([mode]), asciiToBytes("-" + name));
  const ctxOPRF = getCtx(0);
  const ctxVOPRF = getCtx(1);
  const ctxPOPRF = getCtx(2);
  function encode(...args) {
    const res2 = [];
    for (const a of args) {
      if (typeof a === "number")
        res2.push(numberToBytesBE(a, 2));
      else if (typeof a === "string")
        res2.push(asciiToBytes(a));
      else {
        abytes2(a);
        res2.push(numberToBytesBE(a.length, 2), a);
      }
    }
    return concatBytes2(...res2);
  }
  const inputBytes = (title, bytes) => {
    abytes2(bytes, void 0, title);
    if (bytes.length > 65535)
      throw new Error(`"${title}" expected Uint8Array of length <= 65535, got length=${bytes.length}`);
    return bytes;
  };
  const hashInput = (...bytes) => hash(encode(...bytes, "Finalize"));
  function getTranscripts(B, C, D, ctx) {
    const Bm = B.toBytes();
    const seed = hash(encode(Bm, concatBytes2(asciiToBytes("Seed-"), ctx)));
    const res2 = [];
    for (let i = 0; i < C.length; i++) {
      const Ci = C[i].toBytes();
      const Di = D[i].toBytes();
      const di = hashToScalarPrefixed(encode(seed, i, Ci, Di, "Composite"), ctx);
      res2.push(di);
    }
    return res2;
  }
  function computeComposites(B, C, D, ctx) {
    const T = getTranscripts(B, C, D, ctx);
    const M = msm(C, T);
    const Z = msm(D, T);
    return { M, Z };
  }
  function computeCompositesFast(k, B, C, D, ctx) {
    const T = getTranscripts(B, C, D, ctx);
    const M = msm(C, T);
    const Z = M.multiply(k);
    return { M, Z };
  }
  function challengeTranscript(B, M, Z, t2, t3, ctx) {
    const [Bm, a0, a1, a2, a3] = [B, M, Z, t2, t3].map((i) => i.toBytes());
    return hashToScalarPrefixed(encode(Bm, a0, a1, a2, a3, "Challenge"), ctx);
  }
  function generateProof(ctx, k, B, C, D, rng) {
    const { M, Z } = computeCompositesFast(k, B, C, D, ctx);
    const r = randomScalar(rng);
    const t2 = Point.BASE.multiply(r);
    const t3 = M.multiply(r);
    const c = challengeTranscript(B, M, Z, t2, t3, ctx);
    const s = Fn2.sub(r, Fn2.mul(c, k));
    return concatBytes2(...[c, s].map((i) => Fn2.toBytes(i)));
  }
  function verifyProof(ctx, B, C, D, proof) {
    abytes2(proof, 2 * Fn2.BYTES);
    const { M, Z } = computeComposites(B, C, D, ctx);
    const [c, s] = [proof.subarray(0, Fn2.BYTES), proof.subarray(Fn2.BYTES)].map((f) => Fn2.fromBytes(f));
    const t2 = msm([Point.BASE, B], [s, c]);
    const t3 = msm([M, Z], [s, c]);
    const expectedC = challengeTranscript(B, M, Z, t2, t3, ctx);
    if (!Fn2.eql(c, expectedC))
      throw new Error("proof verification failed");
  }
  function generateKeyPair() {
    const skS = randomScalar();
    const pkS = Point.BASE.multiply(skS);
    return { secretKey: Fn2.toBytes(skS), publicKey: pkS.toBytes() };
  }
  function deriveKeyPair(ctx, seed, info) {
    abytes2(seed, 32, "seed");
    info = inputBytes("keyInfo", info);
    const dst = concatBytes2(asciiToBytes("DeriveKeyPair"), ctx);
    const msg = concatBytes2(seed, encode(info), Uint8Array.of(0));
    for (let counter = 0; counter <= 255; counter++) {
      msg[msg.length - 1] = counter;
      const skS = hashToScalar(msg, { DST: dst });
      if (Fn2.is0(skS))
        continue;
      return {
        secretKey: Fn2.toBytes(skS),
        publicKey: Point.BASE.multiply(skS).toBytes()
      };
    }
    throw new Error("Cannot derive key");
  }
  const wirePoint = (label, bytes) => {
    const point = Point.fromBytes(bytes);
    if (point.equals(Point.ZERO))
      throw new Error(label + " point at infinity");
    return point;
  };
  function blind(ctx, input, rng = randomBytes2) {
    input = inputBytes("input", input);
    const blind2 = randomScalar(rng);
    const inputPoint = hashToGroup(input, ctx);
    if (inputPoint.equals(Point.ZERO))
      throw new Error("Input point at infinity");
    const blinded = inputPoint.multiply(blind2);
    return { blind: Fn2.toBytes(blind2), blinded: blinded.toBytes() };
  }
  function evaluate(ctx, secretKey, input) {
    input = inputBytes("input", input);
    const skS = Fn2.fromBytes(secretKey);
    const inputPoint = hashToGroup(input, ctx);
    if (inputPoint.equals(Point.ZERO))
      throw new Error("Input point at infinity");
    const unblinded = inputPoint.multiply(skS).toBytes();
    return hashInput(input, unblinded);
  }
  const oprf = Object.freeze({
    generateKeyPair,
    deriveKeyPair: (seed, keyInfo) => deriveKeyPair(ctxOPRF, seed, keyInfo),
    blind: (input, rng = randomBytes2) => blind(ctxOPRF, input, rng),
    blindEvaluate(secretKey, blindedPoint) {
      const skS = Fn2.fromBytes(secretKey);
      const elm = wirePoint("blinded", blindedPoint);
      return elm.multiply(skS).toBytes();
    },
    finalize(input, blindBytes, evaluatedBytes) {
      input = inputBytes("input", input);
      const blind2 = Fn2.fromBytes(blindBytes);
      const evalPoint = wirePoint("evaluated", evaluatedBytes);
      const unblinded = evalPoint.multiply(Fn2.inv(blind2)).toBytes();
      return hashInput(input, unblinded);
    },
    evaluate: (secretKey, input) => evaluate(ctxOPRF, secretKey, input)
  });
  const voprf = Object.freeze({
    generateKeyPair,
    deriveKeyPair: (seed, keyInfo) => deriveKeyPair(ctxVOPRF, seed, keyInfo),
    blind: (input, rng = randomBytes2) => blind(ctxVOPRF, input, rng),
    blindEvaluateBatch(secretKey, publicKey, blinded, rng = randomBytes2) {
      if (!Array.isArray(blinded))
        throw new Error("expected array");
      const skS = Fn2.fromBytes(secretKey);
      const pkS = wirePoint("public key", publicKey);
      const blindedPoints = blinded.map((i) => wirePoint("blinded", i));
      const evaluated = blindedPoints.map((i) => i.multiply(skS));
      const proof = generateProof(ctxVOPRF, skS, pkS, blindedPoints, evaluated, rng);
      return { evaluated: evaluated.map((i) => i.toBytes()), proof };
    },
    blindEvaluate(secretKey, publicKey, blinded, rng = randomBytes2) {
      const res2 = this.blindEvaluateBatch(secretKey, publicKey, [blinded], rng);
      return { evaluated: res2.evaluated[0], proof: res2.proof };
    },
    finalizeBatch(items, publicKey, proof) {
      if (!Array.isArray(items))
        throw new Error("expected array");
      const pkS = wirePoint("public key", publicKey);
      const blindedPoints = items.map((i) => wirePoint("blinded", i.blinded));
      const evalPoints = items.map((i) => wirePoint("evaluated", i.evaluated));
      verifyProof(ctxVOPRF, pkS, blindedPoints, evalPoints, proof);
      return items.map((i, j) => {
        const input = inputBytes("input", i.input);
        const blind2 = Fn2.fromBytes(i.blind);
        const unblinded = evalPoints[j].multiply(Fn2.inv(blind2)).toBytes();
        return hashInput(input, unblinded);
      });
    },
    finalize(input, blind2, evaluated, blinded, publicKey, proof) {
      return this.finalizeBatch([{ input, blind: blind2, evaluated, blinded }], publicKey, proof)[0];
    },
    evaluate: (secretKey, input) => evaluate(ctxVOPRF, secretKey, input)
  });
  const poprf = (info) => {
    info = copyBytes(inputBytes("info", info));
    const m = hashToScalarPrefixed(encode("Info", info), ctxPOPRF);
    const T = Point.BASE.multiply(m);
    return Object.freeze({
      generateKeyPair,
      deriveKeyPair: (seed, keyInfo) => deriveKeyPair(ctxPOPRF, seed, keyInfo),
      blind(input, publicKey, rng = randomBytes2) {
        input = inputBytes("input", input);
        const pkS = wirePoint("public key", publicKey);
        const tweakedKey = T.add(pkS);
        if (tweakedKey.equals(Point.ZERO))
          throw new Error("tweakedKey point at infinity");
        const blind2 = randomScalar(rng);
        const inputPoint = hashToGroup(input, ctxPOPRF);
        if (inputPoint.equals(Point.ZERO))
          throw new Error("Input point at infinity");
        const blindedPoint = inputPoint.multiply(blind2);
        return {
          blind: Fn2.toBytes(blind2),
          blinded: blindedPoint.toBytes(),
          tweakedKey: tweakedKey.toBytes()
        };
      },
      blindEvaluateBatch(secretKey, blinded, rng = randomBytes2) {
        if (!Array.isArray(blinded))
          throw new Error("expected array");
        const skS = Fn2.fromBytes(secretKey);
        const t = Fn2.add(skS, m);
        const invT = invertSecret(t);
        const blindedPoints = blinded.map((i) => wirePoint("blinded", i));
        const evalPoints = blindedPoints.map((i) => i.multiply(invT));
        const tweakedKey = Point.BASE.multiply(t);
        const proof = generateProof(ctxPOPRF, t, tweakedKey, evalPoints, blindedPoints, rng);
        return { evaluated: evalPoints.map((i) => i.toBytes()), proof };
      },
      blindEvaluate(secretKey, blinded, rng = randomBytes2) {
        const res2 = this.blindEvaluateBatch(secretKey, [blinded], rng);
        return { evaluated: res2.evaluated[0], proof: res2.proof };
      },
      finalizeBatch(items, proof, tweakedKey) {
        if (!Array.isArray(items))
          throw new Error("expected array");
        const inputs = items.map((i) => inputBytes("input", i.input));
        const evalPoints = items.map((i) => wirePoint("evaluated", i.evaluated));
        verifyProof(ctxPOPRF, wirePoint("tweakedKey", tweakedKey), evalPoints, items.map((i) => wirePoint("blinded", i.blinded)), proof);
        return items.map((i, j) => {
          const blind2 = Fn2.fromBytes(i.blind);
          const point = evalPoints[j].multiply(Fn2.inv(blind2)).toBytes();
          return hashInput(inputs[j], info, point);
        });
      },
      finalize(input, blind2, evaluated, blinded, proof, tweakedKey) {
        return this.finalizeBatch([{ input, blind: blind2, evaluated, blinded }], proof, tweakedKey)[0];
      },
      evaluate(secretKey, input) {
        input = inputBytes("input", input);
        const skS = Fn2.fromBytes(secretKey);
        const inputPoint = hashToGroup(input, ctxPOPRF);
        if (inputPoint.equals(Point.ZERO))
          throw new Error("Input point at infinity");
        const t = Fn2.add(skS, m);
        const invT = invertSecret(t);
        const unblinded = inputPoint.multiply(invT).toBytes();
        return hashInput(input, info, unblinded);
      }
    });
  };
  const res = { name, oprf, voprf, poprf, __tests: Object.freeze({ Fn: Fn2, invertSecret }) };
  return Object.freeze(res);
}

// node_modules/@noble/curves/ed25519.js
var _0n6 = /* @__PURE__ */ BigInt(0);
var _1n6 = /* @__PURE__ */ BigInt(1);
var _2n4 = /* @__PURE__ */ BigInt(2);
var _3n2 = /* @__PURE__ */ BigInt(3);
var _5n2 = /* @__PURE__ */ BigInt(5);
var _8n3 = /* @__PURE__ */ BigInt(8);
var ed25519_CURVE_p = /* @__PURE__ */ BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed");
var ed25519_CURVE = /* @__PURE__ */ (() => ({
  p: ed25519_CURVE_p,
  n: BigInt("0x1000000000000000000000000000000014def9dea2f79cd65812631a5cf5d3ed"),
  h: _8n3,
  a: BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffec"),
  d: BigInt("0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3"),
  Gx: BigInt("0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a"),
  Gy: BigInt("0x6666666666666666666666666666666666666666666666666666666666666658")
}))();
function ed25519_pow_2_252_3(x) {
  const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
  const P = ed25519_CURVE_p;
  const x2 = x * x % P;
  const b2 = x2 * x % P;
  const b4 = pow2(b2, _2n4, P) * b2 % P;
  const b5 = pow2(b4, _1n6, P) * x % P;
  const b10 = pow2(b5, _5n2, P) * b5 % P;
  const b20 = pow2(b10, _10n, P) * b10 % P;
  const b40 = pow2(b20, _20n, P) * b20 % P;
  const b80 = pow2(b40, _40n, P) * b40 % P;
  const b160 = pow2(b80, _80n, P) * b80 % P;
  const b240 = pow2(b160, _80n, P) * b80 % P;
  const b250 = pow2(b240, _10n, P) * b10 % P;
  const pow_p_5_8 = pow2(b250, _2n4, P) * x % P;
  return { pow_p_5_8, b2 };
}
function adjustScalarBytes(bytes) {
  bytes[0] &= 248;
  bytes[31] &= 127;
  bytes[31] |= 64;
  return bytes;
}
var ED25519_SQRT_M1 = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
function uvRatio(u, v) {
  const P = ed25519_CURVE_p;
  const v3 = mod(v * v * v, P);
  const v7 = mod(v3 * v3 * v, P);
  const pow3 = ed25519_pow_2_252_3(u * v7).pow_p_5_8;
  let x = mod(u * v3 * pow3, P);
  const vx2 = mod(v * x * x, P);
  const root1 = x;
  const root2 = mod(x * ED25519_SQRT_M1, P);
  const useRoot1 = vx2 === u;
  const useRoot2 = vx2 === mod(-u, P);
  const noRoot = vx2 === mod(-u * ED25519_SQRT_M1, P);
  if (useRoot1)
    x = root1;
  if (useRoot2 || noRoot)
    x = root2;
  if (isNegativeLE(x, P))
    x = mod(-x, P);
  return { isValid: useRoot1 || useRoot2, value: x };
}
var ed25519_Point = /* @__PURE__ */ edwards(ed25519_CURVE, { uvRatio });
var Fp = /* @__PURE__ */ (() => ed25519_Point.Fp)();
function toMontgomery(point) {
  const { y } = point;
  return Fp.toBytes(Fp.div(_1n6 + y, _1n6 - y));
}
function toMontgomerySecret(secretKey) {
  const size = ed25519_Point.Fp.BYTES;
  abytes(secretKey, size);
  return adjustScalarBytes(sha512(secretKey.subarray(0, size))).subarray(0, size);
}
var Fn = /* @__PURE__ */ (() => ed25519_Point.Fn)();
function ed25519_domain(data, ctx, phflag) {
  if (ctx.length > 255)
    throw new Error("Context is too big");
  return concatBytes(asciiToBytes("SigEd25519 no Ed25519 collisions"), new Uint8Array([phflag ? 1 : 0, ctx.length]), ctx, data);
}
function ed(opts) {
  return eddsa(ed25519_Point, sha512, Object.assign({ adjustScalarBytes, toMontgomery, toMontgomerySecret, zip215: true }, opts));
}
var ed25519 = /* @__PURE__ */ ed({});
var ed25519ctx = /* @__PURE__ */ ed({ domain: ed25519_domain });
var ed25519ph = /* @__PURE__ */ ed({ domain: ed25519_domain, prehash: sha512 });
var ed25519_FROST = /* @__PURE__ */ (() => createFROST({
  name: "FROST-ED25519-SHA512-v1",
  Point: ed25519_Point,
  validatePoint: (p) => {
    p.assertValidity();
    if (!p.isTorsionFree())
      throw new Error("bad point: not torsion-free");
  },
  hash: sha512,
  // RFC 9591 keeps H2 undecorated here for RFC 8032 compatibility. In createFROST(),
  // `H2: ''` becomes an empty DST prefix; the built-in hashToScalar fallback treats
  // that the same as omitted DST, even though custom hooks can still observe the empty bag.
  H2: ""
}))();
var x25519 = /* @__PURE__ */ (() => {
  const P = ed25519_CURVE_p;
  const powPminus2 = (x) => {
    const { pow_p_5_8, b2 } = ed25519_pow_2_252_3(x);
    return mod(pow2(pow_p_5_8, _3n2, P) * b2, P);
  };
  return montgomery({
    P,
    type: "x25519",
    powPminus2,
    adjustScalarBytes,
    // ~3x faster fixed-base: [k]B on the birationally-equivalent Edwards curve using cached
    // base tables, mapped back via u = (1+y)/(1-y) = (Z+Y)/(Z-Y) with one Fermat inversion.
    // Same construction as libsodium's crypto_scalarmult_curve25519_base.
    scalarMultBase: (k) => {
      const kn = mod(k, ed25519_Point.Fn.ORDER);
      if (kn === _0n6)
        return _0n6;
      const p = ed25519_Point.BASE.multiply(kn);
      return mod((p.Z + p.Y) * powPminus2(mod(p.Z - p.Y, P)), P);
    }
  });
})();
var ELL2_C1 = /* @__PURE__ */ (() => (ed25519_CURVE_p + _3n2) / _8n3)();
var ELL2_C2 = /* @__PURE__ */ (() => Fp.pow(_2n4, ELL2_C1))();
var ELL2_C3 = /* @__PURE__ */ (() => Fp.sqrt(Fp.neg(Fp.ONE)))();
var ELL2_J = /* @__PURE__ */ BigInt(486662);
function _map_to_curve_elligator2_curve25519(u) {
  let tv1 = Fp.sqr(u);
  tv1 = Fp.mul(tv1, _2n4);
  let xd = Fp.add(tv1, Fp.ONE);
  let x1n = Fp.neg(ELL2_J);
  let tv2 = Fp.sqr(xd);
  let gxd = Fp.mul(tv2, xd);
  let gx1 = Fp.mul(tv1, ELL2_J);
  gx1 = Fp.mul(gx1, x1n);
  gx1 = Fp.add(gx1, tv2);
  gx1 = Fp.mul(gx1, x1n);
  let tv3 = Fp.sqr(gxd);
  tv2 = Fp.sqr(tv3);
  tv3 = Fp.mul(tv3, gxd);
  tv3 = Fp.mul(tv3, gx1);
  tv2 = Fp.mul(tv2, tv3);
  let y11 = ed25519_pow_2_252_3(tv2).pow_p_5_8;
  y11 = Fp.mul(y11, tv3);
  let y12 = Fp.mul(y11, ELL2_C3);
  tv2 = Fp.sqr(y11);
  tv2 = Fp.mul(tv2, gxd);
  let e1 = Fp.eql(tv2, gx1);
  let y1 = Fp.cmov(y12, y11, e1);
  let x2n = Fp.mul(x1n, tv1);
  let y21 = Fp.mul(y11, u);
  y21 = Fp.mul(y21, ELL2_C2);
  let y22 = Fp.mul(y21, ELL2_C3);
  let gx2 = Fp.mul(gx1, tv1);
  tv2 = Fp.sqr(y21);
  tv2 = Fp.mul(tv2, gxd);
  let e2 = Fp.eql(tv2, gx2);
  let y2 = Fp.cmov(y22, y21, e2);
  tv2 = Fp.sqr(y1);
  tv2 = Fp.mul(tv2, gxd);
  let e3 = Fp.eql(tv2, gx1);
  let xn = Fp.cmov(x2n, x1n, e3);
  let y = Fp.cmov(y2, y1, e3);
  let e4 = Fp.isOdd(y);
  y = Fp.cmov(y, Fp.neg(y), e3 !== e4);
  return { xMn: xn, xMd: xd, yMn: y, yMd: _1n6 };
}
var ELL2_C1_EDWARDS = /* @__PURE__ */ (() => FpSqrtEven(Fp, Fp.neg(BigInt(486664))))();
function map_to_curve_elligator2_edwards25519(u) {
  const { xMn, xMd, yMn, yMd } = _map_to_curve_elligator2_curve25519(u);
  let xn = Fp.mul(xMn, yMd);
  xn = Fp.mul(xn, ELL2_C1_EDWARDS);
  let xd = Fp.mul(xMd, yMn);
  let yn = Fp.sub(xMn, xMd);
  let yd = Fp.add(xMn, xMd);
  let tv1 = Fp.mul(xd, yd);
  let e = Fp.eql(tv1, Fp.ZERO);
  xn = Fp.cmov(xn, Fp.ZERO, e);
  xd = Fp.cmov(xd, Fp.ONE, e);
  yn = Fp.cmov(yn, Fp.ONE, e);
  yd = Fp.cmov(yd, Fp.ONE, e);
  const [xd_inv, yd_inv] = FpInvertBatch(Fp, [xd, yd], true);
  return { x: Fp.mul(xn, xd_inv), y: Fp.mul(yn, yd_inv) };
}
var ed25519_hasher = /* @__PURE__ */ (() => createHasher2(ed25519_Point, (scalars) => map_to_curve_elligator2_edwards25519(scalars[0]), {
  DST: "edwards25519_XMD:SHA-512_ELL2_RO_",
  encodeDST: "edwards25519_XMD:SHA-512_ELL2_NU_",
  p: ed25519_CURVE_p,
  m: 1,
  k: 128,
  expand: "xmd",
  hash: sha512
}))();
var SQRT_M1 = ED25519_SQRT_M1;
var SQRT_AD_MINUS_ONE = /* @__PURE__ */ BigInt("25063068953384623474111414158702152701244531502492656460079210482610430750235");
var INVSQRT_A_MINUS_D = /* @__PURE__ */ BigInt("54469307008909316920995813868745141605393597292927456921205312896311721017578");
var ONE_MINUS_D_SQ = /* @__PURE__ */ BigInt("1159843021668779879193775521855586647937357759715417654439879720876111806838");
var D_MINUS_ONE_SQ = /* @__PURE__ */ BigInt("40440834346308536858101042469323190826248399146238708352240133220865137265952");
var invertSqrt = (number) => uvRatio(_1n6, number);
var MAX_255B = /* @__PURE__ */ BigInt("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
var bytes255ToNumberLE = (bytes) => Fp.create(bytesToNumberLE(bytes) & MAX_255B);
function calcElligatorRistrettoMap(r0) {
  const { d } = ed25519_CURVE;
  const r = Fp.mul(Fp.mulN(SQRT_M1, r0), r0);
  const Ns = Fp.mul(Fp.addN(r, _1n6), ONE_MINUS_D_SQ);
  let c = BigInt(-1);
  const D = Fp.mul(Fp.subN(c, Fp.mulN(d, r)), Fp.add(r, d));
  let { isValid: Ns_D_is_sq, value: s } = uvRatio(Ns, D);
  let s_ = Fp.mul(s, r0);
  if (!Fp.isOdd(s_))
    s_ = Fp.neg(s_);
  if (!Ns_D_is_sq)
    s = s_;
  if (!Ns_D_is_sq)
    c = r;
  const Nt = Fp.sub(Fp.mulN(Fp.mulN(c, Fp.subN(r, _1n6)), D_MINUS_ONE_SQ), D);
  const s2 = Fp.sqrN(s);
  const W0 = Fp.mul(Fp.addN(s, s), D);
  const W1 = Fp.mul(Nt, SQRT_AD_MINUS_ONE);
  const W2 = Fp.sub(_1n6, s2);
  const W3 = Fp.add(_1n6, s2);
  return new ed25519_Point(Fp.mul(W0, W3), Fp.mul(W2, W1), Fp.mul(W1, W3), Fp.mul(W0, W2));
}
var _RistrettoPoint = class __RistrettoPoint extends PrimeEdwardsPoint {
  // Do NOT change syntax: the following gymnastics is done,
  // because typescript strips comments, which makes bundlers disable tree-shaking.
  // prettier-ignore
  static BASE = /* @__PURE__ */ (() => new __RistrettoPoint(ed25519_Point.BASE))();
  // prettier-ignore
  static ZERO = /* @__PURE__ */ (() => new __RistrettoPoint(ed25519_Point.ZERO))();
  // prettier-ignore
  static Fp = /* @__PURE__ */ (() => Fp)();
  // prettier-ignore
  static Fn = /* @__PURE__ */ (() => Fn)();
  constructor(ep) {
    super(ep);
  }
  /**
   * Create one Ristretto255 point from affine Edwards coordinates.
   * This wraps the internal Edwards representative directly and is not a
   * canonical ristretto255 decoding path.
   * Use `toBytes()` / `fromBytes()` if canonical ristretto255 bytes matter.
   */
  static fromAffine(ap) {
    return new __RistrettoPoint(ed25519_Point.fromAffine(ap));
  }
  assertSame(other) {
    if (!(other instanceof __RistrettoPoint))
      throw new Error("RistrettoPoint expected");
  }
  init(ep) {
    return new __RistrettoPoint(ep);
  }
  static fromBytes(bytes) {
    abytes(bytes, 32);
    const { a, d } = ed25519_CURVE;
    const s = bytes255ToNumberLE(bytes);
    if (!equalBytes(Fp.toBytes(s), bytes) || Fp.isOdd(s))
      throw new Error("invalid ristretto255 encoding 1");
    const s2 = Fp.sqr(s);
    const u1 = Fp.add(_1n6, Fp.mulN(a, s2));
    const u2 = Fp.sub(_1n6, Fp.mulN(a, s2));
    const u1_2 = Fp.sqr(u1);
    const u2_2 = Fp.sqr(u2);
    const v = Fp.sub(Fp.mulN(Fp.mulN(a, d), u1_2), u2_2);
    const { isValid, value: I } = invertSqrt(Fp.mul(v, u2_2));
    const Dx = Fp.mul(I, u2);
    const Dy = Fp.mul(Fp.mulN(I, Dx), v);
    let x = Fp.mul(Fp.addN(s, s), Dx);
    if (Fp.isOdd(x))
      x = Fp.neg(x);
    const y = Fp.mul(u1, Dy);
    const t = Fp.mul(x, y);
    if (!isValid || Fp.isOdd(t) || Fp.is0(y))
      throw new Error("invalid ristretto255 encoding 2");
    return new __RistrettoPoint(new ed25519_Point(x, y, Fp.ONE, t));
  }
  /**
   * Converts ristretto-encoded string to ristretto point.
   * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-decode).
   * @param hex - Ristretto-encoded 32 bytes. Not every 32-byte string is valid ristretto encoding
   */
  static fromHex(hex) {
    return __RistrettoPoint.fromBytes(hexToBytes(hex));
  }
  /**
   * Encodes ristretto point to Uint8Array.
   * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-encode).
   */
  toBytes() {
    let { X, Y, Z, T } = this.ep;
    const u1 = Fp.mul(Fp.add(Z, Y), Fp.sub(Z, Y));
    const u2 = Fp.mul(X, Y);
    const u2sq = Fp.sqr(u2);
    const { value: invsqrt } = invertSqrt(Fp.mul(u1, u2sq));
    const D1 = Fp.mul(invsqrt, u1);
    const D2 = Fp.mul(invsqrt, u2);
    const zInv = Fp.mul(Fp.mulN(D1, D2), T);
    let D;
    if (Fp.isOdd(Fp.mul(T, zInv))) {
      let _x = Fp.mul(Y, SQRT_M1);
      let _y = Fp.mul(X, SQRT_M1);
      X = _x;
      Y = _y;
      D = Fp.mul(D1, INVSQRT_A_MINUS_D);
    } else {
      D = D2;
    }
    if (Fp.isOdd(Fp.mul(X, zInv)))
      Y = Fp.neg(Y);
    let s = Fp.mul(Fp.subN(Z, Y), D);
    if (Fp.isOdd(s))
      s = Fp.neg(s);
    return Fp.toBytes(s);
  }
  /**
   * Compares two Ristretto points.
   * Described in [RFC9496](https://www.rfc-editor.org/rfc/rfc9496#name-equals).
   */
  equals(other) {
    this.assertSame(other);
    const { X: X1, Y: Y1 } = this.ep;
    const { X: X2, Y: Y2 } = other.ep;
    const one = Fp.eql(Fp.mul(X1, Y2), Fp.mul(Y1, X2));
    const two = Fp.eql(Fp.mul(Y1, Y2), Fp.mul(X1, X2));
    return one || two;
  }
  is0() {
    return this.equals(__RistrettoPoint.ZERO);
  }
};
var ristretto255 = /* @__PURE__ */ (() => {
  Object.freeze(_RistrettoPoint.BASE);
  Object.freeze(_RistrettoPoint.ZERO);
  Object.freeze(_RistrettoPoint.prototype);
  Object.freeze(_RistrettoPoint);
  return Object.freeze({ Point: _RistrettoPoint });
})();
var ristretto255_hasher = /* @__PURE__ */ Object.freeze({
  Point: _RistrettoPoint,
  /**
  * Spec: https://www.rfc-editor.org/rfc/rfc9380.html#name-hashing-to-ristretto255. Caveats:
  * * There are no test vectors
  * * encodeToCurve / mapToCurve is undefined
  * * mapToCurve would be `calcElligatorRistrettoMap(scalars[0])`, not ristretto255_map!
  * * hashToScalar is undefined too, so we just use OPRF implementation
  * * We cannot re-use 'createHasher', because ristretto255_map is different algorithm/RFC
    (os2ip -> bytes255ToNumberLE)
  * * mapToCurve == calcElligatorRistrettoMap, hashToCurve == ristretto255_map
  * * hashToScalar is undefined in RFC9380 for ristretto, so we use the OPRF
    version here. Using `bytes255ToNumblerLE` will create a different result
    if we use `bytes255ToNumberLE` as os2ip
  * * current version is closest to spec.
  */
  hashToCurve(msg, options) {
    const DST = options?.DST === void 0 ? "ristretto255_XMD:SHA-512_R255MAP_RO_" : options.DST;
    const xmd = expand_message_xmd(msg, DST, 64, sha512);
    return ristretto255_hasher.deriveToCurve(xmd);
  },
  hashToScalar(msg, options) {
    const DST = options?.DST === void 0 ? _DST_scalar : options.DST;
    const xmd = expand_message_xmd(msg, DST, 64, sha512);
    return Fn.create(bytesToNumberLE(xmd));
  },
  /**
   * HashToCurve-like construction based on RFC 9496 (Element Derivation).
   * Converts 64 uniform random bytes into a curve point.
   *
   * WARNING: This represents an older hash-to-curve construction from before
   * RFC 9380 was finalized.
   * It was later reused as a component in the newer
   * `hash_to_ristretto255` function defined in RFC 9380.
   */
  deriveToCurve(bytes) {
    abytes(bytes, 64);
    const r1 = bytes255ToNumberLE(bytes.subarray(0, 32));
    const R1 = calcElligatorRistrettoMap(r1);
    const r2 = bytes255ToNumberLE(bytes.subarray(32, 64));
    const R2 = calcElligatorRistrettoMap(r2);
    return new _RistrettoPoint(R1.add(R2));
  }
});
var ristretto255_oprf = /* @__PURE__ */ (() => createOPRF({
  name: "ristretto255-SHA512",
  Point: _RistrettoPoint,
  hash: sha512,
  hashToGroup: ristretto255_hasher.hashToCurve,
  hashToScalar: ristretto255_hasher.hashToScalar
}))();
var ristretto255_FROST = /* @__PURE__ */ (() => createFROST({
  name: "FROST-RISTRETTO255-SHA512-v1",
  Point: _RistrettoPoint,
  validatePoint: (p) => {
    p.assertValidity();
  },
  hash: sha512
}))();
var ED25519_TORSION_SUBGROUP = /* @__PURE__ */ Object.freeze([
  "0100000000000000000000000000000000000000000000000000000000000000",
  "c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac037a",
  "0000000000000000000000000000000000000000000000000000000000000080",
  "26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc05",
  "ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f",
  "26e8958fc2b227b045c3f489f2ef98f0d5dfac05d3c63339b13802886d53fc85",
  "0000000000000000000000000000000000000000000000000000000000000000",
  "c7176a703d4dd84fba3c0b760d10670f2a2053fa2c39ccc64ec7fd7792ac03fa"
]);
export {
  ED25519_TORSION_SUBGROUP,
  _map_to_curve_elligator2_curve25519,
  ed25519,
  ed25519_FROST,
  ed25519_hasher,
  ed25519ctx,
  ed25519ph,
  ristretto255,
  ristretto255_FROST,
  ristretto255_hasher,
  ristretto255_oprf,
  x25519
};
/*! Bundled license information:

@noble/curves/utils.js:
@noble/curves/abstract/modular.js:
@noble/curves/abstract/curve.js:
@noble/curves/abstract/edwards.js:
@noble/curves/abstract/montgomery.js:
@noble/curves/abstract/oprf.js:
@noble/curves/ed25519.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
