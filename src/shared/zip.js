const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

const u16 = (value) => Uint8Array.of(value & 255, (value >>> 8) & 255);
const u32 = (value) => Uint8Array.of(value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255);

export function makeZip(entries) {
  const encoder = new TextEncoder();
  const chunks = [];
  const directory = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const data = entry.data instanceof Uint8Array ? entry.data : new Uint8Array(entry.data);
    const crc = crc32(data);
    const local = [u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name, data];
    chunks.push(...local);
    directory.push([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]);
    offset += local.reduce((sum, piece) => sum + piece.length, 0);
  }
  const dirStart = offset;
  directory.forEach((record) => {
    chunks.push(...record);
    offset += record.reduce((sum, piece) => sum + piece.length, 0);
  });
  chunks.push(u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(offset - dirStart), u32(dirStart), u16(0));
  return new Blob(chunks, { type: 'application/zip' });
}
