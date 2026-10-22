# Familect 家乡话 — 方言常用语词典 设计文档

- 日期：2026-10-14
- 状态：待评审
- 视觉参考：项目根目录下的 `首页.pdf`、`闽南语方言页.pdf`、`词条页：阿嬷.pdf`（2026-10-13 设计稿）

## 1. 目标与范围

**目标**：帮人「听懂家里长辈说的话」。每条方言词句都提供正字、标准拼音、谐音读法、English 读法、中英文释义和例句。

**用户**：想学说家乡话的年轻人、海外华人第二代，以及要去见对象家长的人。

**成功标准**
- 访客可以从首页进入某种方言，再进入具体词条，看到写法、读法和意思
- 支持搜索，可以按中文、谐音、英文或拼音（不带声调也行）找到词条
- 界面可以切换简体、繁体、英文
- 访客能对读音或释义报告问题，站长能在后台看到
- 站长新增或修改内容时只需要改 YAML 文件，推送到 git 后自动上线；数据格式有误时构建失败，错误数据不会上线

**第一版不做**：录音（页面上保留「真人录音即将上线」的占位）、跨方言对比（首页的对比表、词条页的「其他方言怎么说」）、用户账号、内容管理后台、俚语专区页面。

## 2. 技术方案

| 部分 | 选型 |
|---|---|
| 站点框架 | Astro，静态输出（SSG） |
| 内容 | 每种方言一个 YAML 文件，用 Astro Content Collections 和 zod schema 做校验 |
| 繁体 | 构建时用 `opencc-js` 将简体转为繁体 |
| 搜索 | 构建时为每种语言生成 JSON 索引，在浏览器里本地匹配 |
| 反馈接口 | Cloudflare Pages Functions：`functions/api/feedback.js` |
| 反馈存储 | Cloudflare D1 |
| 邮件通知 | Cloudflare Email Routing 的 `send_email` 绑定。可选，有了自有域名再启用 |
| 托管 | Cloudflare Pages，连接 GitHub 仓库，推送到 `main` 后自动构建 |

页面上的 JS 只用于以下几处：搜索、筛选、语言偏好、反馈表单。不引入前端框架，用原生 JS。

## 3. 目录结构

```
dialect/
├─ src/
│  ├─ content/dialects/        # 每种方言一个 .yaml，站长日常只改这里
│  │  ├─ minnan.yaml
│  │  ├─ cantonese.yaml
│  │  ├─ teochew.yaml          # status: soon
│  │  ├─ hakka.yaml            # status: soon
│  │  └─ shanghainese.yaml     # status: soon
│  ├─ content.config.ts        # 内容 schema
│  ├─ i18n/
│  │  ├─ ui.ts                 # 界面文字：简 / 繁 / EN 三语
│  │  └─ convert.ts            # 简→繁转换及字段取值工具
│  ├─ lib/
│  │  ├─ search.ts             # 拼音归一化和匹配（前端、构建共用，带单元测试）
│  │  └─ entries.ts            # 取词条、相关词条、上一条/下一条
│  ├─ layouts/Base.astro       # 页头（Logo、语言切换）、页脚、<head>（hreflang）
│  ├─ components/
│  │  ├─ DialectCard.astro
│  │  ├─ EntryCard.astro
│  │  ├─ SearchBox.astro
│  │  ├─ FilterBar.astro       # 分类侧栏 + 地区标签
│  │  ├─ FeedbackForm.astro
│  │  └─ LangSwitch.astro
│  ├─ pages/
│  │  ├─ [...path].astro                        # 所有语言的首页、方言页、词条页都由这一个路由生成
│  │  └─ search/[lang].json.ts                  # 搜索索引
│  ├─ views/                                    # HomeView / DialectView / EntryView
│  └─ styles/global.css
├─ functions/api/feedback.js
├─ migrations/0001_feedback.sql
├─ fonts/src/                   # 思源宋体 Bold 源文件（只用于构建）
├─ scripts/subset-font.mjs      # 构建前按实际用字裁剪字体
├─ public/_headers              # 字体等静态资源的缓存头
├─ tests/                       # vitest
├─ wrangler.toml
└─ docs/superpowers/specs/
```

## 4. 数据模型

### 4.1 方言文件（如 `src/content/dialects/minnan.yaml`）

文件名就是方言的 id，也是网址中的 slug。

```yaml
name: 闽南语
nameHant: 台語                # 繁体页用的名称（可选），当地叫法和自动转换结果不同时才写
nameEn: Hokkien / Taiwanese
status: live                 # live | soon
order: 1                     # 首页排序
reviewed: false              # false 时页面显示「示例数据，正式上线前需母语者校对」
areas: 厦门、泉州、漳州、台湾、新加坡、马来西亚          # 首页卡片上的地区说明
areasEn: Xiamen, Quanzhou, Zhangzhou, Taiwan, Singapore, Malaysia
intro: 通行于福建南部、台湾，以及新加坡、马来西亚、菲律宾等地的华人社区……
introEn: Spoken in southern Fujian, Taiwan, and Chinese communities in ...
romanization: { name: 台罗拼音, nameEn: Tâi-lô }
traditional: true            # 可选，使用者主要写繁体时，英文页标题和摘要也用繁体字形

regions:                     # 地区筛选标签（可选）
  - { id: xm, name: 厦门, nameEn: Xiamen }
  - { id: tw, name: 台湾, nameEn: Taiwan }
  - { id: sgmy, name: 新马, nameEn: Singapore / Malaysia }

categories:                  # 分类（必填，至少一个）
  - { id: kinship, name: 亲属称谓, nameEn: Family }
  - { id: greeting, name: 日常问候, nameEn: Greetings }
  - { id: crude, name: 粗口, nameEn: Crude, caution: true }   # caution：显示「慎用」，词条带砖红标签

entries:
  - id: a-ma                 # 网址 slug：小写字母、数字、连字符
    text: 阿嬷                # 方言原文（正字），不做繁简转换
    alt: [阿妈, 阿嫲]          # 也写作（可选）
    textHant: ~              # 繁体页标题用的繁体字形（可选），自动转换出错时才写
    pron: a-má               # 标准拼音（按该方言的 romanization）
    homophone: 阿妈           # 谐音（近似，可选，不写就不显示）
    enReading: ah-MAH        # English 读法（可选，不写就不显示）
    spellings: [ah ma]       # 网上常见的非正式拼法（可选），显示在页面上，英文摘要里也会带上
    zh: 奶奶；祖母             # 简短释义，用于列表
    en: grandma              # 可选，不写时英文界面显示中文
    meaning: 奶奶，父亲的母亲。日常当面称呼和背后提起都可以用。   # 详细释义（可选，缺省时用 zh）
    meaningEn: Grandma (father's mother). Used both to address ...  # 可选，缺省时用 en；两者都没有时只显示中文
    literal: ~               # 字面直译（可选）
    note: 外婆（母亲的母亲）一般叫"外嬷"（guā-má），见家长时别叫错。   # 使用提示（可选）
    noteEn: ~                # 可选，英文界面缺省时显示中文 note
    category: kinship
    regions: [tw, sgmy]      # 可选，缺省表示通用，任何地区筛选下都显示
    featured: true           # 可选，true 时出现在首页「热门」
    examples:                # 例句（可选）
      - text: 阿嬷，我转来矣。
        pron: A-má, guá tńg--lâi--ah.
        zh: 奶奶，我回来了。
        en: Grandma, I am home.   # 可选
    variants:                # 各地说法（可选）
      - { region: 台湾, text: 阿嬷 a-má, note: 最常见的写法 }
      - { region: 厦门, text: ~, note: ~ }      # text 为空时显示「待母语者确认」
```

### 4.2 校验规则（写在 `content.config.ts` 中）

- `status: live` 的方言：`entries` 不能为空，`categories` 至少一个，`intro`、`introEn`、`romanization` 必填
- `status: soon` 的方言：只需要基本信息，可以没有 `entries`
- 必填字段：`id`、`text`、`pron`、`zh`、`category`。`homophone`、`enReading`、`en` 可以先不写，以后再补
- `category` 必须是本方言 `categories` 中已定义的 id；`regions` 中的每一项必须是 `regions` 中已定义的 id
- 同一方言内词条 id 不能重复
- 词条 id 不能和本方言的分类 id 相同，词条 id 和分类 id 都不能是 `export`（三者的网址都在方言目录下）
- 任何一条不满足，构建失败，并报出方言文件名和词条 id

## 5. 页面

所有页面都有三个语言版本（见第 6 节），下面以简体为例。

### 5.1 首页 `/`

（2026-10-14 按用户要求精简：去掉小标题、介绍段、搜索按钮、「选择方言」标题和「按场景查」。）

1. 页头：左侧 Familect 家乡话 Logo，右侧是简/繁/EN 切换
2. Hero：一句大标题「一句方言，怎么写、怎么读、什么意思」，下面是**全站搜索框**（无按钮，边输入边出结果）和一行热门词。热门词由各方言词条中的 `featured: true` 决定（可选字段）
3. 方言卡片：只显示已上线的方言，桌面端多列，手机端一列。卡片显示名称、英文名、地区说明和词条数
4. 卡片下方一行小字「即将上线：潮汕话 · 客家话 · 上海话」，列出 `status: soon` 的方言，不可点击
5. 页脚：「Familect · 方言常用语词典」，右侧是「发现读音有误？在词条页点「报告问题」告诉我们」

### 5.2 方言页 `/minnan/`

1. 页头：Logo，加一个**只搜本方言**的搜索框
2. 面包屑：首页 / 闽南语
3. 标题「闽南语」，后面跟衬线体墨绿色的英文名；下面是 intro，说明使用的拼音方案
4. 地区标签行：全部、厦门、泉州……（只在 `regions` 有定义时显示）
5. 左栏是分类列表：全部词条、各分类，`caution` 的分类右侧标「慎用」。右栏是词条卡片，每张显示原文（衬线大字）、拼音（墨绿）· 谐音，以及中文 · 英文。属于 caution 分类的词条右侧带砖红标签
6. 筛选结果写进网址（`?cat=kinship&region=tw`），刷新或分享后状态不变；不支持 JS 时显示全部词条。分类链接的 href 指向分类页（`/minnan/kinship/`，供搜索引擎收录），点击时仍由脚本就地筛选
7. 手机端：左侧分类栏变成横向滚动的标签
8. `reviewed: false` 时，列表底部显示「示例数据，正式上线前需母语者校对」

### 5.3 词条页 `/minnan/a-ma/`

1. 面包屑：首页 / 闽南语 / 亲属称谓 / 阿嬷。分类链接到分类页 `/minnan/kinship/`
2. 词头卡片：大号衬线原文，旁边是「闽南语 · 亲属称谓」。下面三个小格子：拼音（标题用 romanization 名称）、谐音（近似）、English 读法。再下面是「真人录音即将上线」的虚线占位按钮，以及「也写作：……」
3. 意思：中文释义和英文释义。有 `note` 时显示浅绿底的「使用提示」；有 `literal` 时显示「字面意思」
4. 例句：每句一张卡片，依次是原文、拼音（墨绿）、中文 · English
5. 各地说法：表格，列为地区、说法、备注。`text` 为空时显示「[待母语者确认]」
6. 右侧栏「相关词条」：同分类的其他词条，最多 6 条，下面是「更多亲属称谓 →」链接到分类页。手机端放到正文后面
7. 底部：上一条 / 下一条（按 YAML 中的顺序），以及「报告问题」按钮，点击展开反馈表单
8. 可选字段为空时，对应的区块整块不显示

### 5.4 分类页 `/minnan/kinship/`

（2026-10-22 加入，让「台語粗口」「Chinese New Year wishes in Cantonese」这类按分类搜的词有对应的页面。）

1. 只给有词条的分类生成，三种语言都有，进 sitemap
2. 面包屑：首页 / 闽南语 / 亲属称谓
3. 标题「闽南语亲属称谓」（英文「Hokkien / Taiwanese: Family」），下面一句「共 n 条」；`caution` 分类加一行砖红提示
4. 分类标签行：全部词条（链接到方言页）和本方言其他有词条的分类，当前分类高亮
5. 词条卡片列表，和方言页的卡片一样
6. 网页标题「闽南语亲属称谓：n 条常用说法的写法、读音和意思」，摘要列出前几条原文（英文页带英文释义）

### 5.5 404 页

简单说明找不到页面，附回首页链接。

## 6. 多语言（简 / 繁 / EN）

- **网址**：简体无前缀（`/minnan/a-ma/`），繁体为 `/zh-hant/minnan/a-ma/`，英文为 `/en/minnan/a-ma/`
- **界面文字**：放在 `src/i18n/ui.ts`，三语对照。缺少某个 key 时构建报错
- **繁体内容**：中文字段（`name`、`intro`、`zh`、`meaning`、`note`、`literal`、例句的 `zh`、`variants` 的 `region` 和 `note`、分类和地区名称）在构建时用 OpenCC 转换（简体 → 台湾正体，`cn → tw`）。方言名称写了 `nameHant` 时直接用它（闽南语在繁体页叫「台語」）。**不转换**的字段包括 `alt`、`homophone`、例句原文，以及所有拼音和英文字段，因为方言用字是固定写法
- **词条原文的显示字形**（2026-10-22 起）：繁体页的词头、列表卡片、相关词条、上下条、导出图片用繁体字形（`textHant`，没写时用 OpenCC 转换 `text`）；`traditional: true` 的方言（粤语、闽南语、客家话）英文页也用繁体。只换简繁对应的字，方言特有字 OpenCC 本来就不动；转换出错的写 `textHant` 纠正。逻辑在 `src/i18n/convert.ts` 的 `headword`
- **英文版**：界面为英文。词条页的 meaning 区块先显示英文释义再显示中文；列表卡片的次行改为「英文 · 中文」。`noteEn`、`meaningEn` 缺省时退回中文版本
- **切换**：语言切换按钮链接到当前页面的另一个语言版本。切换时把选择写入 `localStorage`
- **自动选择语言**：打开任意简体页面（无前缀网址）时，`<head>` 里的脚本先看 `localStorage` 里有没有手动选过的语言，没有就看浏览器的第一语言：`zh-CN`/`zh-SG`/`zh-Hans` → 简体，`zh-TW`/`zh-HK`/`zh-MO`/`zh-Hant` → 繁体，其他语言 → 英文，然后跳到当前页面对应的语言版本。带 `/zh-hant/`、`/en/` 前缀的网址视为明确选择，不跳；搜索引擎爬虫不跳；404 页不跳。判断逻辑在 `src/i18n/detect.ts`。按 IP 地区判断暂不做
- 每个页面输出 `hreflang` 标签，`<html lang>` 分别为 `zh-Hans`、`zh-Hant`、`en`

## 7. 搜索

- **索引**：构建时生成 `/search/zh-hans.json`、`/search/zh-hant.json`、`/search/en.json`。每条记录包括方言 id、方言名、词条 id、网址、`text`、`alt`、`pron`、`homophone`、`zh`、`en`，以及预先归一化好的匹配串
- **归一化**（`src/lib/search.ts`，前端和构建共用）：Unicode NFD 分解后去掉组合附加符号（也就是声调符号），转成小写，去掉连字符、空格和数字（粤拼的声调是数字）。例如 `tsia̍h-pá--buē` 变成 `tsiahpabue`，`sik6 zo2` 变成 `sikzo`
- **匹配**：输入归一化后，在各字段中做子串匹配。排序依次为：原文完全相同 > 前缀匹配 > 包含；分数相同时按方言顺序和词条顺序排列。最多显示 10 条
- **交互**：输入框获得焦点时才加载索引（懒加载），输入后显示下拉结果，支持上下键和回车。首页搜全部已上线方言，方言页只搜本方言
- **规模假设**：几千条以内。超出后改用 Pagefind，届时另行设计

## 8. 反馈

### 8.1 表单（词条页）

| 字段 | 必填 | 说明 |
|---|---|---|
| 问题类型 | 是 | 读音/拼音不对、翻译不对、用字不对、其他 |
| 说明 | 是 | 1–1000 字 |
| 方言背景 | 否 | 例如「厦门人」，最多 50 字 |
| 联系方式 | 否 | 最多 100 字 |
| website | — | 蜜罐字段，对用户隐藏，有值时直接丢弃 |

隐藏字段：`dialect`、`entry`、`lang`。用 JS 以 `fetch` 方式 POST 到 `/api/feedback`。提交成功后表单换成「谢谢反馈，我们会核对」；失败时保留已填内容并显示错误提示。

### 8.2 接口 `POST /api/feedback`

- 接收 JSON，按 8.1 的规则校验（类型必须在枚举中，长度不能超限，dialect 和 entry 必须是合法的 slug 格式）
- 蜜罐字段有值时返回 `200`，但不写入
- 校验失败返回 `400 { error: "<字段>" }`；写入 D1 失败返回 `500`
- 写入成功后，如果环境里配置了 `FEEDBACK_EMAIL_TO` 和 `FEEDBACK_EMAIL_FROM`（发件地址，必须属于启用了 Email Routing 的域名），并且存在 `SEND_EMAIL` 绑定，就发一封通知邮件；**邮件发送失败不影响接口返回 200**，只记录日志
- 不记录 IP

### 8.3 D1 表（`migrations/0001_feedback.sql`）

```sql
CREATE TABLE feedback (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  dialect     TEXT    NOT NULL,
  entry       TEXT    NOT NULL,
  lang        TEXT    NOT NULL,
  type        TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  background  TEXT,
  contact     TEXT,
  status      TEXT    NOT NULL DEFAULT 'new'   -- new / done，站长手动更新
);
```

站长可以在 Cloudflare 后台的 D1 控制台直接查看，也可以用 `wrangler d1 execute familect --remote --command "SELECT * FROM feedback WHERE status='new'"` 查询。

### 8.4 以后

如果垃圾提交变多，接入 Cloudflare Turnstile。第一版只靠蜜罐和长度限制。

## 9. 视觉规范

以 PDF 设计稿为准，关键数值如下（实现时从 PDF 中取色并微调）：

| Token | 值（近似） | 用途 |
|---|---|---|
| `--bg` | `#F2F0EB` | 页面底色 |
| `--surface` | `#FFFFFF` | 卡片 |
| `--border` | `#E2DFD8` | 卡片、表格的细边框 |
| `--ink` | `#1C1B19` | 正文、标题；首页深色区块的底色 |
| `--muted` | `#6B6862` | 次要文字 |
| `--accent` | `#0F5C4D` | 墨绿：拼音、链接、主按钮、选中状态 |
| `--accent-soft` | `#E3EEEB` | 使用提示的底色 |
| `--warn` | `#A8321E` | 粗口/慎用标签 |
| `--soon` | `#8A6A1F` | 「即将上线」 |

- **字体**：标题和方言原文用 `"Familect Serif", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", "STSong", serif`，粗体；正文用系统无衬线字体 `system-ui, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`，不下载；英文名也用衬线体
- **字体自托管和按需裁剪**（保证国内外加载都稳定，不依赖 Google Fonts 或其他第三方 CDN）：
  - 在仓库里放一份思源宋体 Bold 的完整源文件（Noto Serif SC Bold，SIL OFL 许可），路径为 `fonts/src/`，只供构建使用，不会发布
  - 构建前运行脚本 `scripts/subset-font.mjs`：收集所有方言 YAML 和界面文字中出现的字符（包括繁体转换后的字），再加上 ASCII、带声调的拉丁字母和常用标点，用 `subset-font`（harfbuzz wasm）裁剪出 `public/fonts/familect-serif.woff2`
  - 文件名中带上内容哈希，配合长期缓存（`Cache-Control: immutable`，写在 `public/_headers` 中）
  - `@font-face` 设置 `font-display: swap`；首页在 `<head>` 中 `preload` 这个字体
  - 字体文件和网站同源，加载是否稳定只取决于网站本身
  - 新增内容后重新构建会自动重新裁剪，不需要手动处理；如果出现漏掉的字，会退回到系统宋体显示，不会出现方框
  - 预计几百个汉字时文件约 100–300KB；超过 1MB 时再考虑按页面拆分
- **圆角**：卡片 12px，按钮和标签全圆角
- **布局**：内容最大宽度约 1040px，左右留白至少 16px；手机端所有多列布局都改为单列
- **深色模式**：第一版**不做**（设计稿中没有），固定使用浅色
- **示例数据提示**：小号灰字，当方言 `reviewed: false` 时显示

## 10. 示例内容

第一版自带以下示例数据，全部标记 `reviewed: false`：
- 闽南语：设计稿中的 6 条（阿嬷、阿公、多谢、食饱未、歹势、炸塞），外加外嬷；阿嬷的内容按设计稿填写完整
- 粤语：5 条左右（唔该、多谢、食咗饭未、嫲嫲等）
- 潮汕话、客家话、上海话：`status: soon`

## 11. 部署

1. 在 GitHub 新建仓库，推送代码（由站长自己操作）
2. Cloudflare 后台 → Workers & Pages → 创建 Pages 项目 → 连接该仓库。构建命令填 `npm run build`，输出目录填 `dist`
3. 创建 D1 数据库：执行 `wrangler d1 create familect`，把返回的 id 填入 `wrangler.toml`，再执行 `wrangler d1 migrations apply familect --remote`
4. D1 绑定（变量名 `DB`）写在 `wrangler.toml` 中。仓库里有这个文件时，Pages 以它为准，不需要再到后台设置
5. 以后有了域名：在 Pages 中绑定自定义域名；启用 Email Routing 并验证收件邮箱；添加 `send_email` 绑定 `SEND_EMAIL`，以及环境变量 `FEEDBACK_EMAIL_TO`

这些步骤会写进 `README.md`。

### 11.1 SEO

- **站点地址**：写在 `astro.config` 的 `site` 中，从环境变量 `SITE_URL` 读取（先用 pages.dev 地址，有了域名后修改）
- **sitemap**：用 `@astrojs/sitemap` 生成，包含三种语言的版本并带 hreflang；`public/robots.txt` 指向 sitemap
- **标题和描述**：
  - 词条页：`阿嬷 a-má — 闽南语怎么说"奶奶" | Familect`；英文版为 `Ah-ma (a-má) — how to say "grandma" in Hokkien | Familect`；description 取自 meaning
  - 方言页：`闽南语常用语 — 写法、读音、意思 | Familect`
- **规范网址**：每页输出 `<link rel="canonical">`，以及三种语言加 `x-default` 的 `hreflang`
- **社交分享**：Open Graph 和 Twitter Card，包括标题、描述和一张统一的站点分享图 `public/og.png`
- **结构化数据**：词条页输出 JSON-LD，类型为 `DefinedTerm`（包括 name、alternateName、description、inDefinedTermSet 指向方言），面包屑输出 `BreadcrumbList`
- **有了域名后**（写进 README）：在 Cloudflare 上设置把 `*.pages.dev` 301 跳转到正式域名；在 Google Search Console 验证域名并提交 sitemap；在 Bing Webmaster Tools 从 GSC 导入；百度搜索资源平台可选

## 12. 测试

- **内容校验**：构建时由 zod schema 完成，外加第 4.2 节中跨字段的引用检查。要有一个用例专门验证「错误数据会让构建失败」
- **单元测试**（vitest）：`search.ts` 的归一化和排序；`feedback.js` 的校验、蜜罐、D1 写入（mock）、邮件开关以及邮件失败时的行为；`convert.ts` 只转换该转的字段
- **构建检查**：`npm run build` 能通过，且三种语言的页面都已生成
- **本地联调**：用 `wrangler pages dev` 运行整站和反馈接口，手动走一遍：首页 → 搜索 → 方言页筛选 → 词条页 → 提交反馈 → D1 中能查到记录
- **视觉检查**：将三个页面与 PDF 设计稿逐一对照，并分别在桌面宽度和 400px 手机宽度下查看

## 13. 待定事项

- 「按场景查」是否保留（见第 5.1 节第 4 点）
- 网站在中国大陆的整体可访问性：免费的 `*.pages.dev` 域名在大陆偶尔会被干扰，绑定自有域名后通常好一些，但 Cloudflare 免费版在大陆没有节点，访问速度一般。如果以后国内访客是主要人群，再评估国内 CDN（需要 ICP 备案）
