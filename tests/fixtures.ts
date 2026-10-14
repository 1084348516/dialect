import { dialectSchema, type Dialect } from '../src/lib/schema';

export const rawMinnan = {
  name: '闽南语',
  nameEn: 'Hokkien',
  status: 'live',
  order: 1,
  areas: '厦门、台湾',
  areasEn: 'Xiamen, Taiwan',
  intro: '通行于福建南部、台湾。',
  introEn: 'Spoken in southern Fujian and Taiwan.',
  romanization: { name: '台罗拼音', nameEn: 'Tâi-lô' },
  regions: [{ id: 'tw', name: '台湾', nameEn: 'Taiwan' }],
  categories: [
    { id: 'kinship', name: '亲属称谓', nameEn: 'Family' },
    { id: 'greeting', name: '日常问候', nameEn: 'Greetings' },
    { id: 'crude', name: '粗口', nameEn: 'Crude', caution: true },
  ],
  entries: [
    {
      id: 'a-ma', text: '阿嬷', alt: ['阿嫲'], pron: 'a-má', homophone: '阿妈', enReading: 'ah-MAH',
      zh: '奶奶；祖母', en: 'grandma', meaning: '奶奶，父亲的母亲。', note: '外婆一般叫外嬷。',
      category: 'kinship', regions: ['tw'], featured: true,
      examples: [{ text: '阿嬷，我转来矣。', pron: 'A-má, guá tńg--lâi--ah.', zh: '奶奶，我回来了。', en: 'Grandma, I am home.' }],
      variants: [{ region: '台湾', text: '阿嬷 a-má', note: '最常见的写法' }, { region: '厦门', text: null, note: null }],
    },
    { id: 'a-kong', text: '阿公', pron: 'a-kong', homophone: '阿公', enReading: 'ah-KONG', zh: '爷爷；祖父', en: 'grandpa', category: 'kinship' },
    { id: 'to-sia', text: '多谢', pron: 'to-siā', homophone: '多下', enReading: 'doh-SIAH', zh: '谢谢', en: 'thank you', category: 'greeting', featured: true },
  ],
};

export function makeDialect(overrides: Record<string, unknown> = {}, id = 'minnan'): Dialect {
  return { ...dialectSchema.parse({ ...rawMinnan, ...overrides }), id };
}
