// 在浏览器里把选中的词条画成 3:4 分享图。只在客户端使用。
import { CARD_W, CARD_H, MAX_PER_CARD, wrapLines, type CardEntry } from './export';

export interface CardSpec {
  title: string;
  subtitle: string;
  entries: CardEntry[];
  footerLabel: string;
  footerUrl: string;
  page: number;
  pages: number;
}

// 与 src/styles/global.css 的配色保持一致
const C = { bg: '#F2F0EB', surface: '#FFFFFF', border: '#E2DFD8', ink: '#1C1B19', muted: '#6B6862', accent: '#0F5C4D' };
const SERIF = '"Familect Serif", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", serif';
const SANS = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

const PAD = 80;
const INNER = CARD_W - PAD * 2;
const ROW_PAD = 32;
const ROW_GAP = 20;
const TEXT_COL = 300;
const FOOTER_H = 140;

const serif = (px: number) => `700 ${px}px ${SERIF}`;
const sans = (px: number, weight = 400) => `${weight} ${px}px ${SANS}`;

/** 画图前确保网站字体已加载，否则 Canvas 会悄悄用系统字体。 */
export async function loadFonts(texts: string[]): Promise<void> {
  const all = texts.join('');
  await Promise.all([document.fonts.load(serif(64), all), document.fonts.load(sans(30), all), document.fonts.load(sans(30, 600), all)]);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** 字号从 max 往下缩，直到放得进宽度。 */
function fitFont(ctx: CanvasRenderingContext2D, text: string, width: number, max: number, min: number, font: (px: number) => string): number {
  let px = max;
  ctx.font = font(px);
  while (px > min && ctx.measureText(text).width > width) {
    px -= 2;
    ctx.font = font(px);
  }
  return px;
}

export function drawCard(canvas: HTMLCanvasElement, spec: CardSpec): void {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  const measure = (s: string) => ctx.measureText(s).width;
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // 顶部：品牌 + 标题 + 副标题
  let y = PAD + 30;
  ctx.font = serif(30);
  ctx.fillStyle = C.ink;
  ctx.fillText('Familect', PAD, y);
  const brandW = measure('Familect ');
  ctx.font = serif(22);
  ctx.fillStyle = C.accent;
  ctx.fillText('家乡话', PAD + brandW, y);

  y += 40;
  ctx.font = serif(68);
  ctx.fillStyle = C.ink;
  for (const line of wrapLines(spec.title, INNER, measure, 2)) {
    y += 84;
    ctx.fillText(line, PAD, y);
  }
  y += 60;
  ctx.font = sans(30);
  ctx.fillStyle = C.muted;
  ctx.fillText(wrapLines(spec.subtitle, INNER, measure, 1)[0] ?? '', PAD, y);
  y += 44;

  // 词条行：按每张最多 MAX_PER_CARD 行算行高，保证各张图版式一致
  // 词少的那张把词条块放在标题与页脚之间的视觉中线上，避免下半张留白
  const rowsBottom = CARD_H - FOOTER_H;
  const rowH = Math.min(176, (rowsBottom - y - ROW_GAP * (MAX_PER_CARD - 1)) / MAX_PER_CARD);
  const blockH = spec.entries.length * (rowH + ROW_GAP) - ROW_GAP;
  y += Math.max(0, (rowsBottom - y - blockH) / 2 - 40);
  const rightX = PAD + ROW_PAD + TEXT_COL + 28;
  const rightW = PAD + INNER - ROW_PAD - rightX;

  for (const e of spec.entries) {
    ctx.fillStyle = C.surface;
    roundRect(ctx, PAD, y, INNER, rowH, 20);
    ctx.fill();
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    const mid = y + rowH / 2;
    const textPx = fitFont(ctx, e.text, TEXT_COL, 60, 30, serif);
    ctx.fillStyle = C.ink;
    ctx.fillText(e.text, PAD + ROW_PAD, mid + textPx * 0.36);

    // 右侧：读音 + 谐音，释义；谐音跟在读音后放不下时单独占一行
    ctx.font = sans(32, 600);
    const pron = wrapLines(e.pron, rightW, measure, 1)[0] ?? '';
    const pronW = measure(pron);
    ctx.font = sans(28);
    const inline = e.sub ? `  ·  ${e.sub}` : '';
    const ownLine = !!e.sub && pronW + measure(inline) > rightW;
    const line1Y = ownLine ? mid - 30 : mid - 10;

    ctx.font = sans(32, 600);
    ctx.fillStyle = C.accent;
    ctx.fillText(pron, rightX, line1Y);
    ctx.font = sans(28);
    ctx.fillStyle = C.muted;
    if (ownLine) ctx.fillText(wrapLines(e.sub!, rightW, measure, 1)[0] ?? '', rightX, line1Y + 40);
    else if (inline) ctx.fillText(inline, rightX + pronW, line1Y);

    ctx.font = sans(30);
    ctx.fillStyle = C.ink;
    ctx.fillText(wrapLines(e.gloss, rightW, measure, 1)[0] ?? '', rightX, line1Y + (ownLine ? 86 : 48));

    y += rowH + ROW_GAP;
  }

  // 底部：引流网址 + 页码
  const footY = CARD_H - PAD + 10;
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, CARD_H - FOOTER_H + 30);
  ctx.lineTo(PAD + INNER, CARD_H - FOOTER_H + 30);
  ctx.stroke();

  ctx.font = sans(28);
  ctx.fillStyle = C.muted;
  const label = `${spec.footerLabel}  `;
  ctx.fillText(label, PAD, footY);
  const labelW = measure(label);
  ctx.font = sans(28, 600);
  ctx.fillStyle = C.accent;
  ctx.fillText(spec.footerUrl, PAD + labelW, footY);

  if (spec.pages > 1) {
    ctx.font = sans(28);
    ctx.fillStyle = C.muted;
    ctx.textAlign = 'right';
    ctx.fillText(`${spec.page} / ${spec.pages}`, PAD + INNER, footY);
    ctx.textAlign = 'left';
  }
}
