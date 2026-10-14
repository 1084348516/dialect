// 生成 1200×630 的站点分享图。只在需要更新图片时手动运行：node scripts/make-og.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#F2F0EB"/>
  <rect x="0" y="560" width="1200" height="70" fill="#0F5C4D"/>
  <text x="96" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="128" font-weight="700" fill="#1C1B19">Familect</text>
  <text x="100" y="390" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="#0F5C4D">Everyday Chinese dialect phrases</text>
  <text x="100" y="450" font-family="Arial, Helvetica, sans-serif" font-size="30" fill="#6B6862">Cantonese · Hokkien · Teochew · Hakka · Shanghainese</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(fileURLToPath(new URL('../public/og.png', import.meta.url)));
console.log('wrote public/og.png');
