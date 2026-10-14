import type { APIRoute, GetStaticPaths } from 'astro';
import { LANGS, type Lang } from '../../i18n/langs';
import { getDialects } from '../../lib/data';
import { buildSearchRecords } from '../../lib/search-index';

export const getStaticPaths = (() => LANGS.map((lang) => ({ params: { lang }, props: { lang } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const lang = props.lang as Lang;
  const records = buildSearchRecords(await getDialects(lang), lang);
  return new Response(JSON.stringify(records), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
