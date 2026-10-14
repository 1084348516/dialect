import { z } from 'zod';

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RESERVED_IDS = ['zh-hans', 'zh-hant', 'en', 'search', 'fonts', 'api', '_astro'];

const slug = z.string().regex(SLUG_RE, 'must be a slug: lowercase letters, digits and single hyphens');
const text = z.string().trim().min(1);
const optText = z.string().trim().min(1).nullish().transform((v) => v ?? undefined);

const exampleSchema = z.object({ text, pron: text, zh: text, en: text });
const variantSchema = z.object({ region: text, text: optText, note: optText });
const regionSchema = z.object({ id: slug, name: text, nameEn: text });
const categorySchema = regionSchema.extend({ caution: z.boolean().default(false) });

export const entrySchema = z.object({
  id: slug,
  text,
  alt: z.array(text).default([]),
  pron: text,
  homophone: text,
  enReading: text,
  zh: text,
  en: text,
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
    nameEn: text,
    status: z.enum(['live', 'soon']),
    order: z.number().int(),
    reviewed: z.boolean().default(false),
    areas: text,
    areasEn: text,
    intro: optText,
    introEn: optText,
    romanization: z.object({ name: text, nameEn: text }).optional(),
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
    const regionIds = new Set(d.regions.map((r) => r.id));
    d.entries.forEach((e, i) => {
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
