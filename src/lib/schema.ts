import { z } from 'zod';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RESERVED_IDS = ['zh-hans', 'zh-hant', 'en', 'search', 'fonts', 'api', '_astro'];
/** 方言目录下的功能页，词条 id 和分类 id 都不能与之重名 */
export const RESERVED_ENTRY_IDS = ['export'];

const slug = z.string().regex(SLUG_RE, 'must be a slug: lowercase letters, digits and single hyphens');
const text = z.string().trim().min(1);
const optText = z.string().trim().min(1).nullish().transform((v) => v ?? undefined);

const exampleSchema = z.object({ text, pron: text, zh: text, en: optText });
const variantSchema = z.object({ region: text, text: optText, note: optText });
const regionSchema = z.object({ id: slug, name: text, nameEn: text });
const categorySchema = regionSchema.extend({ caution: z.boolean().default(false) });

export const entrySchema = z.object({
  id: slug,
  text,
  alt: z.array(text).default([]),
  /** 繁体页标题用的繁体字形；自动转换出错时才需要写 */
  textHant: optText,
  pron: text,
  homophone: optText,
  enReading: optText,
  /** 网上常见的非正式拼法（如 m goy、paiseh），方便按这些拼法搜索的人找到 */
  spellings: z.array(text).default([]),
  zh: text,
  en: optText,
  meaning: optText,
  meaningEn: optText,
  literal: optText,
  note: optText,
  noteEn: optText,
  category: slug,
  regions: z.array(slug).default([]),
  featured: z.boolean().default(false),
  examples: z.array(exampleSchema).default([]),
  variants: z.array(variantSchema).default([]),
});

export const dialectSchema = z
  .object({
    name: text,
    /** 繁体页用的名称；当地叫法和简体名称转换结果不同时才需要写，如闽南语在台湾叫“台語” */
    nameHant: optText,
    nameEn: text,
    status: z.enum(['live', 'soon']),
    order: z.number().int(),
    reviewed: z.boolean().default(false),
    areas: text,
    areasEn: text,
    intro: optText,
    introEn: optText,
    romanization: z.object({ name: text, nameEn: text }).optional(),
    /** 使用者主要写繁体字（港台、东南亚），英文页标题和摘要用繁体字形 */
    traditional: z.boolean().default(false),
    regions: z.array(regionSchema).default([]),
    categories: z.array(categorySchema).default([]),
    entries: z.array(entrySchema).default([]),
  })
  .superRefine((d, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });

    if (d.status === 'live') {
      if (d.entries.length === 0) issue(['entries'], 'a live dialect needs at least one entry');
      if (d.categories.length === 0) issue(['categories'], 'a live dialect needs at least one category');
      if (!d.intro) issue(['intro'], 'a live dialect needs intro');
      if (!d.introEn) issue(['introEn'], 'a live dialect needs introEn');
      if (!d.romanization) issue(['romanization'], 'a live dialect needs romanization');
    }

    const dupes = (ids: string[], what: string, key: string) => {
      const seen = new Set<string>();
      ids.forEach((id, i) => {
        if (seen.has(id)) issue([key, i, 'id'], `duplicate ${what} id "${id}"`);
        seen.add(id);
      });
    };
    dupes(d.categories.map((c) => c.id), 'category', 'categories');
    dupes(d.regions.map((r) => r.id), 'region', 'regions');
    dupes(d.entries.map((e) => e.id), 'entry', 'entries');

    const catIds = new Set(d.categories.map((c) => c.id));
    d.categories.forEach((c, i) => {
      if (RESERVED_ENTRY_IDS.includes(c.id)) issue(['categories', i, 'id'], `category id "${c.id}" is reserved`);
    });
    const regionIds = new Set(d.regions.map((r) => r.id));
    d.entries.forEach((e, i) => {
      if (RESERVED_ENTRY_IDS.includes(e.id)) issue(['entries', i, 'id'], `entry id "${e.id}" is reserved`);
      // 分类页和词条页都在方言目录下（/minnan/kinship/、/minnan/a-ma/），网址不能撞
      if (catIds.has(e.id)) issue(['entries', i, 'id'], `entry id "${e.id}" clashes with a category id`);
      if (!catIds.has(e.category)) issue(['entries', i, 'category'], `entry "${e.id}": unknown category "${e.category}"`);
      e.regions.forEach((r, j) => {
        if (!regionIds.has(r)) issue(['entries', i, 'regions', j], `entry "${e.id}": unknown region "${r}"`);
      });
    });
  });

export type Dialect = z.output<typeof dialectSchema> & { id: string };
export type Entry = z.output<typeof entrySchema>;
export type Category = Dialect['categories'][number];
export type Region = Dialect['regions'][number];
export type Example = Entry['examples'][number];
export type Variant = Entry['variants'][number];

export function assertDialectId(id: string): void {
  if (!SLUG_RE.test(id)) throw new Error(`dialect file name "${id}" must be a slug (lowercase letters, digits, hyphens)`);
  if (RESERVED_IDS.includes(id)) throw new Error(`dialect file name "${id}" is reserved`);
}
