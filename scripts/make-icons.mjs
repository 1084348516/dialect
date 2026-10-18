// 由 public/favicon.svg 生成位图图标：Bing 不认 SVG 图标，Google 偏好 48px 倍数的图标，iOS 要 apple-touch-icon。
// 只在改了 favicon.svg 后手动运行：node scripts/make-icons.mjs
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const pub = (p) => fileURLToPath(new URL(`../public/${p}`, import.meta.url));
const svg = await readFile(pub('favicon.svg'));
const png = (size) => sharp(svg, { density: 72 * (size / 64) * 2 }).resize(size, size).png().toBuffer();

// ICO 文件里直接嵌 PNG：6 字节文件头 + 每张图 16 字节目录项 + 图片数据
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, at);
    header.writeUInt8(size >= 256 ? 0 : size, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((x) => x.data)]);
}

const sizes = [16, 32, 48];
await writeFile(pub('favicon.ico'), ico(await Promise.all(sizes.map(async (size) => ({ size, data: await png(size) })))));
await writeFile(pub('icon-192.png'), await png(192));
// iOS 会自己加圆角，用不带圆角的满版底色更好看
const square = Buffer.from(svg.toString().replace(/ rx="\d+"/, ''));
await writeFile(pub('apple-touch-icon.png'), await sharp(square, { density: 72 * (180 / 64) * 2 }).resize(180, 180).png().toBuffer());
console.log('wrote public/favicon.ico, public/icon-192.png, public/apple-touch-icon.png');
