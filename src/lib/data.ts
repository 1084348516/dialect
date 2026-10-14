import { getCollection } from 'astro:content';
import { localizeDialect } from '../i18n/convert';
import type { Lang } from '../i18n/langs';
import { assertDialectId, type Dialect } from './schema';

let cache: Promise<Dialect[]> | undefined;

export function loadDialects(): Promise<Dialect[]> {
  cache ??= getCollection('dialects').then((items) =>
    items
      .map((item) => {
        assertDialectId(item.id);
        return { ...item.data, id: item.id } as Dialect;
      })
      .sort((a, b) => a.order - b.order),
  );
  return cache;
}

export async function getDialects(lang: Lang): Promise<Dialect[]> {
  return (await loadDialects()).map((d) => localizeDialect(d, lang));
}
