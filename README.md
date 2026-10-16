# Familect 家乡话

方言常用语词典：怎么写、怎么读、什么意思。Astro 静态站，部署在 Cloudflare Workers（静态资源 + 反馈接口）。

## 本地开发

```bash
npm install
npm run dev        # http://localhost:4321（不含反馈接口）
npm test           # 单元测试 + 内容格式检查
npm run build && npm run verify
npx wrangler d1 migrations apply familect --local   # 第一次需要执行
npx wrangler dev                                    # 整站 + 反馈接口，http://localhost:8787
```

## 加内容

只需要改 `src/content/dialects/*.yaml`。字段说明见 `docs/superpowers/specs/2026-10-14-familect-design.md` 第 4 节。

- 新方言：新建 `<id>.yaml`，文件名就是网址，只能用小写字母、数字和连字符
- 还没准备好的方言：写 `status: soon`，首页会显示「即将上线」
- 母语者校对完成后：把 `reviewed` 改成 `true`，页面上的「示例数据」提示会消失
- 改完运行 `npm test`，格式有问题会直接指出是哪个文件、哪条词条

- 词条必填的只有 `id`、`text`、`pron`、`zh`、`category`；谐音、English 读法、英文释义可以先空着，页面上不会显示对应的栏目

`npm run verify` 会按 YAML 的实际内容检查构建结果（每条词条三种语言的页面都生成了、反馈用的词条清单条数对得上、没写的栏目没有显示等），换内容不需要改这个脚本。

## 部署到 Cloudflare Workers

1. 在 GitHub 新建仓库并推送代码
2. 创建 D1 数据库：
   ```bash
   npx wrangler login
   npx wrangler d1 create familect
   ```
   把输出的 `database_id` 填进 `wrangler.toml`，然后执行：
   ```bash
   npx wrangler d1 migrations apply familect --remote
   ```
3. Cloudflare 后台 → Workers & Pages → Create → Import a repository，选择这个仓库：
   - Project name: `dialect`（必须和 `wrangler.toml` 的 `name` 一致）
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
   - 构建环境变量: `NODE_VERSION` = `22`
4. 以后推送到 `main` 分支就会自动部署。静态资源目录、反馈接口入口（`worker/index.js`）和 D1 绑定都从 `wrangler.toml` 读取，不需要在后台另外设置。

## 查看反馈

```bash
npx wrangler d1 execute familect --remote --command "SELECT * FROM feedback WHERE status='new' ORDER BY id DESC"
npx wrangler d1 execute familect --remote --command "UPDATE feedback SET status='done' WHERE id=1"
```

也可以在 Cloudflare 后台 → D1 → familect → Console 中直接查询。

防止乱发：反馈接口只接受本站页面发来的请求，每个 IP 每分钟最多 3 条（`wrangler.toml` 的 `[[ratelimits]]`），每天（北京时间）最多发 30 封通知邮件（`src/server/feedback.js` 的 `MAX_EMAILS_PER_DAY`），超出的只入库不发信。被刷了的话可以按时间批量删掉：

```bash
npx wrangler d1 execute familect --remote --command "DELETE FROM feedback WHERE status='new' AND created_at >= '2026-10-16 00:00:00'"
```

## 域名：familect.org

正式地址是 `https://familect.org`（不带 www），已写成 `astro.config.mjs` 中 `site` 的默认值，sitemap、canonical 和 robots.txt 都用它，不需要再设置 `SITE_URL`。预览部署的 canonical 也指向正式域名，所以不会被当成重复页面收录。

1. Worker `dialect` → Settings → Domains & Routes → 添加 Custom domain `familect.org`，再添加 `www.familect.org`（域名在同一个 Cloudflare 账号里，DNS 记录会自动创建）
2. 把 www 301 跳转到主域名：familect.org → Rules → Redirect Rules → 用模板 “Redirect from WWW to root”，状态码 301，勾选保留查询字符串
3. 关掉重复的入口：Worker `dialect` → Settings → Domains & Routes，把 `workers.dev` 和 Preview URLs 都设为 Disabled，这样网站只能通过 familect.org 访问
4. 邮件通知：
   - 为 familect.org 启用 Email Routing，并验证你的收件邮箱
   - `wrangler.toml` 已启用 `[[send_email]]` 绑定，并用 `keep_vars = true` 保留后台设置的变量
   - 在 Worker 的 Settings → Variables and Secrets 中加入 `FEEDBACK_EMAIL_TO`（你的邮箱）和 `FEEDBACK_EMAIL_FROM`（例如 `feedback@familect.org`）
5. 搜索引擎：
   - Google Search Console：添加“网域”资源 `familect.org`，用 DNS TXT 验证（在 Cloudflare DNS 中添加），提交 `https://familect.org/sitemap-index.xml`
   - Bing Webmaster Tools：选择从 Google Search Console 导入
   - 百度搜索资源平台：可选

## 字体

标题使用思源宋体 Bold（`fonts/src/`，SIL OFL 许可）。`npm run build` 和 `npm run dev` 会先执行 `scripts/subset-font.mjs`，只保留网站实际用到的字，输出到 `public/fonts/`。
