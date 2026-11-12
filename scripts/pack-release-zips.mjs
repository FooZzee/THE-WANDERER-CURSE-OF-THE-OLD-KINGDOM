import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_DIR = path.join(ROOT, 'dist');

// Standard CRC-32 table for ZIP archive headers
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.zipPath.replace(/\\/g, '/'), 'utf8');
    const rawData = entry.data;
    const uncompressedSize = rawData.length;
    const crc = crc32(rawData);
    const deflated = zlib.deflateRawSync(rawData, { level: 9 });
    const useDeflate = deflated.length < uncompressedSize;
    const payload = useDeflate ? deflated : rawData;
    const compressedSize = payload.length;
    const method = useDeflate ? 8 : 0;

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 flag
    localHeader.writeUInt16LE(method, 8); // compression method
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0x576b, 12); // mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra length

    localParts.push(localHeader, nameBuf, payload);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x576b, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42); // relative offset

    centralParts.push(centralHeader, nameBuf);
    offset += 30 + nameBuf.length + compressedSize;
  }

  const centralDirBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirBuf, eocd]);
}

function collectFilesRecursive(absDir, zipPrefix = '') {
  const results = [];
  if (!fs.existsSync(absDir)) return results;
  const items = fs.readdirSync(absDir, { withFileTypes: true });
  for (const item of items) {
    if (item.name === '.DS_Store' || item.name.endsWith('.zip')) continue;
    const fullPath = path.join(absDir, item.name);
    const relZipPath = zipPrefix ? `${zipPrefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      results.push(...collectFilesRecursive(fullPath, relZipPath));
    } else if (item.isFile()) {
      results.push({
        zipPath: relZipPath,
        data: fs.readFileSync(fullPath),
      });
    }
  }
  return results;
}

function addSingleFile(entries, relFilePath, zipPath = relFilePath) {
  const abs = path.join(ROOT, relFilePath);
  if (fs.existsSync(abs)) {
    entries.push({
      zipPath,
      data: fs.readFileSync(abs),
    });
  }
}

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// 1. Build public/the-wanderer-godot.zip
const godotEntries = collectFilesRecursive(path.join(ROOT, 'godot'), 'godot');
const godotZipPath = path.join(PUBLIC_DIR, 'the-wanderer-godot.zip');
fs.writeFileSync(godotZipPath, createZipBuffer(godotEntries));
console.log(`✓ Created ${godotZipPath} (${godotEntries.length} files)`);

// 2. Build public/the-wanderer-web.zip (from fresh dist/ + documentation)
const webEntries = [];
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  webEntries.push({
    zipPath: 'index.html',
    data: fs.readFileSync(path.join(DIST_DIR, 'index.html')),
  });
}
webEntries.push(...collectFilesRecursive(path.join(DIST_DIR, 'assets'), 'assets'));
for (const docFile of ['README.md', 'CHANGELOG.md', 'RELEASE_NOTES.md', 'LICENSE']) {
  addSingleFile(webEntries, docFile);
}
const webZipPath = path.join(PUBLIC_DIR, 'the-wanderer-web.zip');
fs.writeFileSync(webZipPath, createZipBuffer(webEntries));
console.log(`✓ Created ${webZipPath} (${webEntries.length} files)`);

// 3. Build public/the-wanderer-github.zip (complete clean GitHub repository source)
const githubEntries = [
  ...collectFilesRecursive(path.join(ROOT, 'src'), 'src'),
  ...collectFilesRecursive(path.join(ROOT, 'godot'), 'godot'),
  ...collectFilesRecursive(path.join(ROOT, '.github'), '.github'),
  ...collectFilesRecursive(path.join(ROOT, 'scripts'), 'scripts'),
];
for (const rootFile of [
  'server.ts',
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'metadata.json',
  '.gitignore',
  '.env.example',
  'README.md',
  'CHANGELOG.md',
  'RELEASE_NOTES.md',
  'LICENSE',
]) {
  addSingleFile(githubEntries, rootFile);
}
const githubZipPath = path.join(PUBLIC_DIR, 'the-wanderer-github.zip');
fs.writeFileSync(githubZipPath, createZipBuffer(githubEntries));
console.log(`✓ Created ${githubZipPath} (${githubEntries.length} files)`);
