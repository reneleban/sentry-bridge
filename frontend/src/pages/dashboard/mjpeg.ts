// Minimal parser for the multipart/x-mixed-replace stream served by /stream.
// Each part carries a Content-Length header, which this parser relies on.

const HEADER_END = [13, 10, 13, 10]; // "\r\n\r\n"

function indexOfSequence(buf: Uint8Array, seq: number[], from = 0): number {
  outer: for (let i = from; i <= buf.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) {
      if (buf[i + j] !== seq[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/** Returns a push function that feeds chunks and emits complete JPEG frames. */
export function createMjpegParser(
  onFrame: (jpeg: Uint8Array) => void
): (chunk: Uint8Array) => void {
  let buf: Uint8Array = new Uint8Array(0);
  const decoder = new TextDecoder();

  return (chunk) => {
    buf = buf.length ? concat(buf, chunk) : chunk;
    for (;;) {
      const headerEnd = indexOfSequence(buf, HEADER_END);
      if (headerEnd < 0) return;
      const headers = decoder.decode(buf.subarray(0, headerEnd));
      const match = /content-length:\s*(\d+)/i.exec(headers);
      const bodyStart = headerEnd + HEADER_END.length;
      if (!match) {
        // Not a part header (e.g. stray bytes) — skip past it.
        buf = buf.subarray(bodyStart);
        continue;
      }
      const length = Number(match[1]);
      if (buf.length < bodyStart + length) return;
      onFrame(buf.slice(bodyStart, bodyStart + length));
      buf = buf.subarray(bodyStart + length);
    }
  };
}
