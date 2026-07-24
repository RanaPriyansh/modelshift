/**
 * Returns true as soon as a JavaScript string exceeds a UTF-8 byte ceiling.
 * This avoids allocating a second multi-megabyte buffer before deciding
 * whether browser-owned storage is safe to parse.
 */
export function exceedsUtf8ByteLimit(value: string, maximumBytes: number): boolean {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) return true;
  if (value.length > maximumBytes) return true;

  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) {
      bytes += 1;
    } else if (codeUnit <= 0x7ff) {
      bytes += 2;
    } else if (
      codeUnit >= 0xd800
      && codeUnit <= 0xdbff
      && index + 1 < value.length
      && value.charCodeAt(index + 1) >= 0xdc00
      && value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index += 1;
    } else {
      // Unpaired surrogates are encoded as the three-byte replacement scalar.
      bytes += 3;
    }
    if (bytes > maximumBytes) return true;
  }
  return false;
}
