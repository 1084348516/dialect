# Familect 家乡话

方言常用语词典：怎么写、怎么读、什么意思。Astro 静态站，部署在 Cloudflare Pages。

## 本地开发

```bash
npm install
npm run dev        # http://localhost:4321（不含反馈接口）
npm test           # 单元测试 + 内容格式检查
npm run build && npm run verify
npx wrangler d1 migrations apply familect --local   # 第一次需要执行
npx wrangler pages dev                              # 整站 + 反馈接口，http://localhost:8788
```

## 加内容

只需要改 `src/content/dialects/*.yaml`。字段说明见 `docs/superpowers/specs/2026-10-14-familect-design.md` 第 4 节。

- 新方言：新建 `<id>.yaml`，文件名就是网址，只能用小写字母、数字和连字符
- 还没准备好的方言：写 `status: soon`，首页会显示「即将上线」
- 母语者校对完成后：把 `reviewed` 改成 `true`，页面上的「示例数据」提示会消失
- 改完运行 `npm test`，格式有问题会直接指出是哪个文件、哪条词条

`npm run verify` 是针对示例数据写的检查，换掉示例数据后需要相应修改 `scripts/verify-dist.mjs`，或者不再使用它。

## 部署到 Cloudflare Pages

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
3. Cloudflare 后台 → Workers & Pages → Create → Pages → Connect to Git，选择这个仓库：
   - Build command: `npm run build`
   - Build output directory: `dist`
   - 环境变量: `NODE_VERSION` = `22`
4. 以后推送到 `main` 分支就会自动部署。D1 绑定从 `wrangler.toml` 读取，不需要在后台另外设置。

## 查看反馈

```bash
npx wrangler d1 execute familect --remote --command "SELECT * FROM feedback WHERE status='new' ORDER BY id DESC"
npx wrangler d1 execute familect --remote --command "UPDATE feedback SET status='done' WHERE id=1"
```

也可以在 Cloudflare 后台 → D1 → familect → Console 中直接查询。

## 有了自有域名之后

1. Pages 项目 → Custom domains → 添加域名
2. 构建环境变量中加入 `SITE_URL=https://你的域名`（用于 sitemap 和 canonical）
3. 把 `*.pages.dev` 301 跳转到正式域名（Bulk Redirects 或 Pages 的 `_redirects`）
4. 邮件通知：
   - 为该域名启用 Email Routing，并验证你的收件邮箱
   - 取消 `wrangler.toml` 中 `[[send_email]]` 部分的注释
   - 在 Pages 设置中加入环境变量 `FEEDBACK_EMAIL_TO`（你的邮箱）和 `FEEDBACK_EMAIL_FROM`（例如 `feedback@你的域名`）
5. 搜索引擎：
   - Google Search Console：验证域名，提交 `https://你的域名/sitemap-index.xml`
   - Bing Webmaster Tools：选择从 Google Search Console 导入
   - 百度搜索资源平台：可选

## 字体

标题使用思源宋体 Bold（`fonts/src/`，SIL OFL 许可）。`npm run build` 和 `npm run dev` 会先执行 `scripts/subset-font.mjs`，只保留网站实际用到的字，输出到 `public/fonts/`。
