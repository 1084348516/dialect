// 按网站实际用字裁剪思源宋体 Bold，输出 woff2 到 public/fonts/，并把文件路径写入 src/generated/font.json。
import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const EXTRA = '，。、；：？！“”‘’（）《》「」『』—…·／';

export function collectChars(texts) {
  const set = new Set();
  for (let c = 0x20; c <= 0x7e; c++) set.add(String.fromCharCode(c));
  for (const ch of EXTRA) set.add(ch);
  for (const t of texts) for (const ch of t.normalize('NFC')) if (!/\s/.test(ch)) set.add(ch);
  return [...set].sort().join('');
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const { default: subsetFont } = await import('subset-font');
  const OpenCC = await import('opencc-js');
  const toHant = OpenCC.Converter({ from: 'cn', to: 'tw' });

  const contentDir = path.join(root, 'src/content/dialects');
  const files = (await readdir(contentDir)).filter((f) => f.endsWith('.yaml')).map((f) => path.join(contentDir, f));
  files.push(path.join(root, 'src/i18n/ui.ts'), path.join(root, 'src/i18n/info.ts'));
  const texts = await Promise.all(files.map((f) => readFile(f, 'utf8')));
  const chars = collectChars([...texts, ...texts.map(toHant)]);

  const source = await readFile(path.join(root, 'fonts/src/NotoSerifSC-Bold.otf'));
  const woff2 = await subsetFont(source, chars, { targetFormat: 'woff2' });
  const hash = createHash('sha256').update(woff2).digest('hex').slice(0, 10);
  const name = `familect-serif.${hash}.woff2`;

  const outDir = path.join(root, 'public/fonts');
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, name), woff2);

  await mkdir(path.join(root, 'src/generated'), { recursive: true });
  await writeFile(path.join(root, 'src/generated/font.json'), `${JSON.stringify({ file: `/fonts/${name}` }, null, 2)}\n`);
  console.log(`font: ${[...chars].length} chars -> public/fonts/${name} (${(woff2.length / 1024).toFixed(1)} KB)`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
