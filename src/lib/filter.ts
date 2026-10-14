export interface Filter {
  cat?: string;
  region?: string;
}

export function parseFilter(search: string, catIds: string[], regionIds: string[]): Filter {
  const p = new URLSearchParams(search);
  const cat = p.get('cat') ?? '';
  const region = p.get('region') ?? '';
  return {
    cat: catIds.includes(cat) ? cat : undefined,
    region: regionIds.includes(region) ? region : undefined,
  };
}

/** 没有标注地区的词条视为通用，任何地区筛选下都显示。 */
export function matchesFilter(item: { cat: string; regions: string[] }, f: Filter): boolean {
  if (f.cat && item.cat !== f.cat) return false;
  if (f.region && item.regions.length > 0 && !item.regions.includes(f.region)) return false;
  return true;
}

export function filterQuery(f: Filter): string {
  const p = new URLSearchParams();
  if (f.cat) p.set('cat', f.cat);
  if (f.region) p.set('region', f.region);
  const s = p.toString();
  return s ? `?${s}` : '';
}
