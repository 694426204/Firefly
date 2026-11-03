# Cloudflare Pages 部署指南

## 一、为什么之前部署出来是"一堆裸文字、图全裂"

Astro 的 `base` **只影响生成 HTML 里的资源 URL 前缀**，并**不会**在输出目录里多套一层子目录：

- `dist/index.html` 永远在 `dist/` 根目录；
- 但页面里的 CSS/JS/图片会写成 `/Firefly/_astro/xxx.css`（当 `base = "/Firefly/"`）。

于是：

| 部署方式 | 站点挂载路径 | 正确的 base | 结果 |
| --- | --- | --- | --- |
| GitHub Pages | `https://694426204.github.io/Firefly/` | `/Firefly/` | 正常 |
| Cloudflare Pages | `https://<project>.pages.dev/`（域名根） | `/` | **所有资源 404 → 页面无样式** |

实测验证（线上 `newman.jueshi.de5.net`）：

```
/Firefly/_astro/xxx.css  ->  404   ← HTML 引用的就是这个路径
/_astro/xxx.css          ->  200   ← 文件其实就在站点根目录
```

## 二、本仓库的解决方案：base / site 随部署目标自适应

`astro.config.mjs` 已改为：

```js
const isCloudflare = Boolean(process.env.CF_PAGES || process.env.CF_WORKERS);
const base = process.env.SITE_BASE ?? (isCloudflare ? "/" : "/Firefly/");
const site = process.env.SITE_URL ?? siteConfig.site_url;
```

- Cloudflare Pages / Workers 会自动注入 `CF_PAGES` / `CF_WORKERS` → `base = "/"`；
- 本地或 GitHub Pages 构建 → `base = "/Firefly/"`；
- 两者都可用 `SITE_BASE` / `SITE_URL` 强制覆盖。

`src/config/siteConfig.ts` 的 `site_url` 同样环境感知：优先 `SITE_URL`，其次 Cloudflare 的 `CF_PAGES_URL`，
最后才回落到默认的 GitHub Pages 地址。这样页脚「站点域名」、RSS、sitemap 里的绝对地址都会指向真实域名。

## 三、Cloudflare Pages 控制台配置

**Settings → Builds & deployments**

| 项 | 值 |
| --- | --- |
| Framework preset | Astro |
| Build command | `pnpm run build` |
| Build output directory | `dist` |
| Root directory | 仓库根（留空） |
| Node.js version | `22`（仓库已用 `.node-version` 固定） |
| pnpm version | `9.14.4`（`package.json` 的 `packageManager` 字段，Cloudflare 用 corepack 自动切换） |

**Settings → Environment variables**（Variables and Secrets）

| 变量 | 必填 | 说明 | 示例 |
| --- | --- | --- | --- |
| `SITE_URL` | 建议填 | 站点对外域名，用于 canonical / RSS / sitemap / 页脚站点域名 | `https://newman.jueshi.de5.net` |
| `SITE_BASE` | 否 | 强制路径前缀，不填自动判断 | `/` |

> `CF_PAGES` 由 Cloudflare 自动注入，无需手动添加。

## 四、Cloudflare Workers（`wrangler.jsonc`）

仓库已配置静态资源直出：

```jsonc
"assets": {
  "directory": "./dist",
  "html_handling": "auto-trailing-slash",
  "not_found_handling": "404-page"   // 用 Astro 生成的 404.html
}
```

部署命令：`pnpm build && pnpm exec wrangler deploy`（`wrangler` 需自行安装为 devDependency）。

## 五、本地复现与验证

```powershell
# 模拟 Cloudflare 环境构建（资源前缀应为 /_astro/... 而非 /Firefly/_astro/...）
$env:CF_PAGES = "1"
$env:SITE_URL = "https://newman.jueshi.de5.net"
pnpm build

# 本地预览
pnpm preview -- --host 127.0.0.1 --port 4176
```

构建完成后可检查 `dist/index.html` 里的资源引用应为 `/_astro/...`，且 `dist/about/index.html` 存在（输出目录不带 base 前缀）。

## 六、常见坑位

1. **jsDelivr 字体拉取失败**：Astro 的 `experimental.fonts` 会从 `cdn.jsdelivr.net` 拉字体，国内网络常被墙，
   表现为构建末尾报 `CannotFetchFontFile`。缓存目录 `node_modules/.astro/fonts`，可从其它机器拷贝补齐。
2. **pnpm 版本不匹配**：`package.json` 锁 `pnpm@9.14.4`，用 pnpm 10+ 会报 `ERR_PNPM_LOCKFILE_BREAKING_CHANGE`。
3. **站内链接 404**：凡是硬编码 `/xxx/` 而没走 `url()` 辅助函数的链接，在非根 base 下都会 404
   （公告栏「了解更多」、侧栏 RSS 图标等已修复，新增链接请一律用 `url()` 包裹）。
4. **邮箱链接**：配置里必须写 `mailto:xxx@qq.com`，否则既 404 又会绕过 base64 混淆暴露邮箱明文。
