/**
 * Ambient types for the npm `qrcode` package (no shipped declarations).
 * The Companion's claim bootstrap uses the same surface the vendored
 * browser build exposes (`toString` with the terminal renderer, which the
 * browser bundle lacks); this declaration points the npm specifier at the
 * vendored type shape.
 */
declare module "qrcode" {
  import QRCode from "../vendor/qrcode.js";
  export default QRCode;
}

interface Window {
  /** The Glass's debug handle (work document #56): the smoke layer and
   * flight recorder read the live mirror document through it. */
  __nofloDebug: {
    mirrorDoc: unknown;
  };
}
