import { toHant } from './convert';
import type { Lang } from './langs';

// 关于、隐私政策、联系我们三个说明页的文案。正文段落是 HTML（只用于本文件里手写的链接）；
// 字符串数组渲染成列表。繁体版由简体自动转换。
export const INFO_PAGES = ['about', 'privacy', 'contact'] as const;
export type InfoPage = (typeof INFO_PAGES)[number];

export const CONTACT_EMAIL = 'ghdbright@gmail.com';

export interface InfoSection {
  heading?: string;
  body: (string | string[])[];
}

export interface InfoDoc {
  /** 页脚链接文字 */
  nav: string;
  title: string;
  description: string;
  sections: InfoSection[];
}

const mail = `<a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>`;
const link = (href: string, text: string) => `<a href="${href}" rel="noopener" target="_blank">${text}</a>`;

const zhHans: Record<InfoPage, InfoDoc> = {
  about: {
    nav: '关于',
    title: '关于我们',
    description: 'Familect（家乡话）是一部方言常用语词典，记录粤语、闽南话、莆田话等方言的写法、读音和意思。',
    sections: [
      {
        body: [
          'Familect（家乡话）是一部方言常用语词典。我们收录粤语、闽南话、莆田话等汉语方言里的日常说法，每个词条都写清楚怎么写、怎么读、什么意思，并尽量附上例句和使用提示。',
        ],
      },
      {
        heading: '为什么做这个网站',
        body: [
          '很多人从小听家里长辈说方言，却不知道这些话怎么写、准确是什么意思；在外地长大的年轻人，学家乡话的机会也越来越少。我们希望把这些常用说法整理下来，让想听懂家人、想学家乡话的人有个方便查的地方。',
        ],
      },
      {
        heading: '我们是谁',
        body: [
          'Familect 由一个热爱方言的小团队维护。词条由团队整理，并在陆续请母语者逐条校对。',
        ],
      },
      {
        heading: '一起改进',
        body: [
          `方言各地说法差异很大，难免有写错、读错的地方。每个词条页都有“报告问题”按钮，页面底部也可以随时给我们留言；你也可以发邮件到 ${mail}。我们会认真核对每一条反馈。`,
        ],
      },
    ],
  },
  privacy: {
    nav: '隐私政策',
    title: '隐私政策',
    description: 'Familect 会处理哪些信息、如何使用，以及广告和 Cookie 的说明。',
    sections: [
      {
        body: [
          '最后更新：2026 年 10 月 17 日',
          '本政策说明 Familect（familect.org，以下简称“本站”）在你使用网站时会处理哪些信息，以及你可以如何管理这些信息。',
        ],
      },
      {
        heading: '我们收集的信息',
        body: [
          [
            '浏览本站不需要注册，也不需要提供任何个人信息。',
            '反馈表单：你主动提交反馈时，我们会保存你填写的内容（问题类型、说明，以及可不填的方言背景和联系方式），以及相关的方言、词条和页面语言。这些信息只用于核对和改进词条、在需要时回复你。',
            '防止滥用：提交反馈时，会临时用你的 IP 地址限制提交频率，IP 地址不会和反馈内容一起保存。',
          ],
        ],
      },
      {
        heading: '浏览器本地存储',
        body: [
          '本站用浏览器的本地存储（localStorage）记住你选择的界面语言。这项数据只保存在你自己的设备上，不会发送给我们。',
        ],
      },
      {
        heading: '服务提供商',
        body: [
          '本站的网站托管、反馈存储和邮件通知使用第三方云服务。服务商为了安全和正常运行，可能会处理访问日志等技术信息，并受其自身隐私政策约束。',
        ],
      },
      {
        heading: '广告和 Cookie',
        body: [
          '本站可能通过 Google AdSense 展示广告。Google 等第三方供应商会使用 Cookie，根据你以往访问本站或其他网站的情况投放广告。Google 使用广告 Cookie，使 Google 及其合作伙伴能够根据你访问本站和/或互联网上其他网站的情况向你投放广告。',
          `你可以在 ${link('https://adssettings.google.com/', 'Google 广告设置')} 中停用个性化广告，也可以访问 ${link('https://www.aboutads.info/', 'www.aboutads.info')} 停用第三方供应商用于个性化广告的 Cookie。想了解 Google 如何使用这些数据，请看 ${link('https://policies.google.com/technologies/partner-sites', 'Google 如何使用来自合作伙伴网站的信息')}。`,
          '如果你位于欧洲经济区、英国或瑞士，本站在使用广告 Cookie 之前会先征得你的同意。',
        ],
      },
      {
        heading: '数据保存与删除',
        body: [
          `反馈内容会保存下来，用于持续改进词条。如果你想删除自己提交的反馈，或对个人信息有任何疑问，请发邮件到 ${mail}，我们会尽快处理。`,
        ],
      },
      {
        heading: '儿童隐私',
        body: ['本站不会有意收集 13 岁以下儿童的个人信息。如果你认为我们误收了这类信息，请联系我们删除。'],
      },
      {
        heading: '政策更新',
        body: ['本政策如有变更，会在本页公布，并更新上方的“最后更新”日期。'],
      },
    ],
  },
  contact: {
    nav: '联系我们',
    title: '联系我们',
    description: '联系 Familect 团队：邮箱和反馈方式。',
    sections: [
      {
        body: ['有问题、建议，或者想一起整理家乡的方言，都欢迎联系我们。'],
      },
      {
        heading: '邮箱',
        body: [mail],
      },
      {
        heading: '反馈词条问题',
        body: [
          '发现某个词条的写法、读音或翻译不对，最方便的是在该词条页点“报告问题”；对整个网站的建议，可以用页面底部的反馈表单。我们会尽快核对。',
        ],
      },
      {
        heading: '参与校对',
        body: ['如果你是方言母语者，愿意帮忙校对词条或录制读音，欢迎来信，并简单介绍你的方言背景。'],
      },
    ],
  },
};

const en: Record<InfoPage, InfoDoc> = {
  about: {
    nav: 'About',
    title: 'About us',
    description: 'Familect is a dictionary of everyday phrases in Chinese dialects such as Cantonese, Hokkien and Putian — how to write, say and understand them.',
    sections: [
      {
        body: [
          'Familect (家乡话, “hometown speech”) is a dictionary of everyday phrases in Chinese dialects such as Cantonese, Hokkien (Minnan) and Putian. Each entry shows how a phrase is written, how it is pronounced and what it means, with examples and usage tips where we have them.',
        ],
      },
      {
        heading: 'Why we built it',
        body: [
          'Many people grow up hearing their grandparents speak a dialect without ever knowing how the words are written or exactly what they mean, and those raised away from home have fewer and fewer chances to learn. We want to collect these everyday phrases in one easy place for anyone who wants to understand their family or learn their hometown dialect.',
        ],
      },
      {
        heading: 'Who we are',
        body: [
          'Familect is run by a small team of dialect enthusiasts. Entries are compiled by the team and are being checked one by one by native speakers.',
        ],
      },
      {
        heading: 'Help us improve',
        body: [
          `Dialects vary a lot from place to place, so mistakes are inevitable. Every entry page has a “Report a problem” button, and you can leave us a message at the bottom of any page or email ${mail}. We read and check every report.`,
        ],
      },
    ],
  },
  privacy: {
    nav: 'Privacy',
    title: 'Privacy Policy',
    description: 'What information Familect processes, how it is used, and how advertising and cookies work on this site.',
    sections: [
      {
        body: [
          'Last updated: October 17, 2026',
          'This policy explains what information Familect (familect.org, “the site”) processes when you use it, and how you can manage that information.',
        ],
      },
      {
        heading: 'Information we collect',
        body: [
          [
            'You can browse the site without an account and without giving us any personal information.',
            'Feedback form: when you choose to send feedback, we store what you enter (problem type, details, and the optional dialect background and contact fields), along with the related dialect, entry and page language. We use it only to check and improve entries and, when needed, to reply to you.',
            'Abuse prevention: when you send feedback, your IP address is used briefly to limit how often submissions can be made. It is not stored with your feedback.',
          ],
        ],
      },
      {
        heading: 'Local storage',
        body: [
          'The site uses your browser’s local storage (localStorage) to remember the interface language you chose. This stays on your device and is never sent to us.',
        ],
      },
      {
        heading: 'Service providers',
        body: [
          'We use third-party cloud services for hosting, storing feedback and sending notification emails. These providers may process technical information such as access logs for security and operations, under their own privacy policies.',
        ],
      },
      {
        heading: 'Advertising and cookies',
        body: [
          'The site may show ads through Google AdSense. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this site or other websites. Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the internet.',
          `You can opt out of personalized advertising in ${link('https://adssettings.google.com/', 'Google Ads Settings')}, or opt out of third-party vendors’ cookies for personalized advertising at ${link('https://www.aboutads.info/', 'www.aboutads.info')}. To learn how Google uses this data, see ${link('https://policies.google.com/technologies/partner-sites', 'How Google uses information from sites that use its services')}.`,
          'If you are in the European Economic Area, the UK or Switzerland, we will ask for your consent before advertising cookies are used.',
        ],
      },
      {
        heading: 'Keeping and deleting data',
        body: [
          `Feedback is kept so we can keep improving entries. To delete feedback you sent, or for any question about your personal information, email ${mail} and we will handle it promptly.`,
        ],
      },
      {
        heading: 'Children’s privacy',
        body: ['The site does not knowingly collect personal information from children under 13. If you believe we have, please contact us and we will delete it.'],
      },
      {
        heading: 'Changes to this policy',
        body: ['If this policy changes, we will post the update on this page and revise the “Last updated” date above.'],
      },
    ],
  },
  contact: {
    nav: 'Contact',
    title: 'Contact us',
    description: 'How to reach the Familect team: email and feedback.',
    sections: [
      {
        body: ['Questions, suggestions, or want to help document your hometown dialect? We’d love to hear from you.'],
      },
      {
        heading: 'Email',
        body: [mail],
      },
      {
        heading: 'Report a problem with an entry',
        body: [
          'If an entry’s writing, pronunciation or translation looks wrong, the quickest way is the “Report a problem” button on that entry’s page. For suggestions about the site as a whole, use the feedback form at the bottom of any page. We’ll check it as soon as we can.',
        ],
      },
      {
        heading: 'Help check entries',
        body: ['If you are a native speaker and would like to help check entries or record pronunciations, please write to us and tell us a little about your dialect background.'],
      },
    ],
  },
};

const hant = (doc: InfoDoc): InfoDoc => ({
  nav: toHant(doc.nav),
  title: toHant(doc.title),
  description: toHant(doc.description),
  sections: doc.sections.map((s) => ({
    heading: s.heading && toHant(s.heading),
    body: s.body.map((b) => (Array.isArray(b) ? b.map(toHant) : toHant(b))),
  })),
});

const zhHant = Object.fromEntries(INFO_PAGES.map((p) => [p, hant(zhHans[p])])) as Record<InfoPage, InfoDoc>;

export const info: Record<Lang, Record<InfoPage, InfoDoc>> = { 'zh-hans': zhHans, 'zh-hant': zhHant, en };
