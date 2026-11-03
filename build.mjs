// NavStudio 静态站生成器 —— 从 data/items.json 生成多页面
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NAV = __dirname;

const DB = JSON.parse(fs.readFileSync(path.join(NAV, "data", "items.json"), "utf8"));
const PLAN = JSON.parse(fs.readFileSync(path.join(NAV, "data", "plan.json"), "utf8"));
const SITE = DB.site;
const ITEMS = DB.items;

const GROUP_ICON = { "网站链接": "🔗", "使用教程": "📘", "问题解答": "💡" };
const GROUPS = [...new Set(ITEMS.map(i => i.group))];
const URL_OF = {};
PLAN.forEach(p => { URL_OF[p.idx] = p.url; });

/* ---------- 工具 ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function slugify(s) {
  return String(s).toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "h";
}

function md(src) {
  const lines = String(src || "").replace(/\r/g, "").split("\n");
  const out = [], toc = [];
  let i = 0, inCode = false, codeBuf = [], codeLang = "", listType = null, tableBuf = [], slugCount = {};

  const flushList = () => { if (listType) { out.push("</" + listType + ">"); listType = null; } };

  const inline = (t) => esc(t)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  const flushTable = () => {
    if (!tableBuf.length) return;
    const rows = tableBuf.filter(r => !/^\s*\|?[\s:\-|]+\|?\s*$/.test(r));
    if (!rows.length) { tableBuf = []; return; }
    let h = "";
    rows.forEach((r, idx) => {
      const cells = r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(c => c.trim());
      const row = "<tr>" + cells.map(c => (idx === 0 ? "<th>" : "<td>") + inline(c) + (idx === 0 ? "</th>" : "</td>")).join("") + "</tr>";
      if (idx === 0) h += "<thead>" + row + "</thead><tbody>";
      else h += row;
    });
    out.push('<div class="table-wrap"><table>' + h + "</tbody></table></div>");
    tableBuf = [];
  };

  const uniq = (base) => {
    const n = (slugCount[base] = (slugCount[base] || 0) + 1);
    return n === 1 ? base : base + "-" + n;
  };

  for (; i < lines.length; i++) {
    const ln = lines[i];

    if (/^\s*```/.test(ln)) {
      if (!inCode) {
        inCode = true; codeBuf = []; codeLang = ln.replace(/^\s*```/, "").trim();
        flushList(); flushTable();
      } else {
        out.push(
          '<div class="code-wrap"><div class="code-bar">' +
            '<div class="code-dots"><i></i><i></i><i></i></div>' +
            '<span class="code-lang">' + esc(codeLang || "text") + "</span>" +
            '<button class="code-copy" data-code="copy">📋 复制</button>' +
          "</div><pre><code>" + esc(codeBuf.join("\n")) + "</code></pre></div>"
        );
        inCode = false;
      }
      continue;
    }
    if (inCode) { codeBuf.push(ln); continue; }

    if (/^\s*\|.*\|\s*$/.test(ln)) { flushList(); tableBuf.push(ln); continue; }
    else if (tableBuf.length) flushTable();

    let m;
    if ((m = ln.match(/^###\s+(.*)/))) { flushList(); const id = uniq(slugify(m[1])); toc.push({ lv: 3, id, t: m[1] }); out.push('<h3 id="' + id + '">' + inline(m[1]) + "</h3>"); continue; }
    if ((m = ln.match(/^##\s+(.*)/)))  { flushList(); const id = uniq(slugify(m[1])); toc.push({ lv: 2, id, t: m[1] }); out.push('<h2 id="' + id + '">' + inline(m[1]) + "</h2>"); continue; }
    if ((m = ln.match(/^#\s+(.*)/)))   { flushList(); const id = uniq(slugify(m[1])); toc.push({ lv: 2, id, t: m[1] }); out.push('<h2 id="' + id + '">' + inline(m[1]) + "</h2>"); continue; }
    if ((m = ln.match(/^>\s?(.*)/)))   { flushList(); out.push("<blockquote><p>" + inline(m[1]) + "</p></blockquote>"); continue; }
    if (/^---+\s*$/.test(ln))          { flushList(); out.push("<hr>"); continue; }
    if ((m = ln.match(/^\s*[-*]\s+(.*)/))) {
      if (listType !== "ul") { flushList(); out.push("<ul>"); listType = "ul"; }
      out.push("<li>" + inline(m[1]) + "</li>"); continue;
    }
    if ((m = ln.match(/^\s*\d+\.\s+(.*)/))) {
      if (listType !== "ol") { flushList(); out.push("<ol>"); listType = "ol"; }
      out.push("<li>" + inline(m[1]) + "</li>"); continue;
    }
    flushList();
    if (ln.trim() === "") continue;
    out.push("<p>" + inline(ln) + "</p>");
  }
  flushList(); flushTable();
  if (inCode && codeBuf.length) out.push('<div class="code-wrap"><pre><code>' + esc(codeBuf.join("\n")) + "</code></pre></div>");

  return { html: out.join(""), toc };
}

function iconHtml(item, cls) {
  const ic = item.icon || "";
  if (/^https?:\/\//.test(ic)) return '<div class="' + cls + '"><img src="' + esc(ic) + '" alt="" loading="lazy"></div>';
  return '<div class="' + cls + '">' + esc(ic || (item.title || "?").charAt(0).toUpperCase()) + "</div>";
}

// 相对路径前缀（子目录页面用 ../）
function rel(depth) { return depth === 0 ? "" : "../"; }

/* ---------- 页面骨架 ---------- */
function layout(opts) {
  const { title, desc, content, depth = 0, activeGroup = null, canonical = "", crumb = "" } = opts;
  const R = rel(depth);
  const navHtml = GROUPS.map(g => {
    const n = ITEMS.filter(i => i.group === g).length;
    const on = g === activeGroup ? " on" : "";
    return '<a class="nav-item' + on + '" href="' + R + 'index.html#' + encodeURIComponent(g) + '">' +
      '<span class="nav-ico">' + (GROUP_ICON[g] || "📁") + '</span>' +
      '<span class="nav-label">' + esc(g) + '</span>' +
      '<span class="nav-count">' + n + '</span></a>';
  }).join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
${canonical ? '<link rel="canonical" href="' + canonical + '">' : ""}
<link rel="stylesheet" href="${R}assets/style.css">
</head>
<body>
<div class="progress" id="progress"></div>
<div class="layout">
  <aside class="sidebar" id="sidebar">
    <div class="brand"><span class="brand-dot"></span><span>${esc(SITE.title)}</span></div>
    <div id="navList">
      <a class="nav-item${activeGroup ? "" : " on"}" href="${R}index.html">
        <span class="nav-ico">🏠</span><span class="nav-label">全部内容</span><span class="nav-count">${ITEMS.length}</span>
      </a>
      ${navHtml}
    </div>
    <div class="sidebar-foot">
      <button class="icon-btn" id="themeBtn" title="切换主题">🌙</button>
      <a class="icon-btn" href="${R}index.html" title="回到首页">🏠</a>
    </div>
  </aside>
  <div class="mask" id="mask"></div>
  <div class="main">
    <header class="topbar">
      <button class="icon-btn menu-btn" id="menuBtn">☰</button>
      <nav class="crumb" id="crumb">${crumb}</nav>
      <div class="spacer"></div>
      <button class="icon-btn" id="printBtn" title="打印/存为 PDF">🖨</button>
    </header>
    <main class="content" id="app">
${content}
    </main>
  </div>
</div>
<button class="to-top" id="toTop" title="回到顶部">↑</button>
<div class="toast" id="toast"></div>
<script src="${R}assets/app.js"></script>
</body>
</html>
`;
}

/* ---------- 卡片 ---------- */
function cardHtml(it, idx, depth) {
  const R = rel(depth);
  const isArt = it.type === "article";
  return '<a class="card" href="' + R + URL_OF[idx] + '">' +
    iconHtml(it, "card-ico") +
    '<div class="card-body">' +
      '<div class="card-title"><span>' + esc(it.title) + "</span>" +
        (isArt ? '<span class="badge-art">文章</span>' : '<span class="badge-link">链接</span>') +
      "</div>" +
      (it.desc ? '<div class="card-desc">' + esc(it.desc) + "</div>" : "") +
      (it.tags && it.tags.length ? '<div class="card-tags">' + it.tags.map(t => '<span class="tag">' + esc(t) + "</span>").join("") + "</div>" : "") +
    "</div></a>";
}

/* ---------- 首页 ---------- */
{
  let h = '<div class="searchbar" id="searchWrap"><span class="s-ico">🔍</span>' +
    '<input id="q" type="text" placeholder="搜索标题、简介或标签…  按 / 聚焦" autocomplete="off">' +
    '<span class="s-kbd">/</span></div>';
  GROUPS.forEach(g => {
    const sub = ITEMS.map((x, i) => ({ x, i })).filter(o => o.x.group === g);
    if (!sub.length) return;
    h += '<div class="group" id="' + encodeURIComponent(g) + '"><div class="group-head">' +
      '<span class="group-title">' + (GROUP_ICON[g] || "📁") + " " + esc(g) + "</span>" +
      '<span class="group-n">' + sub.length + "</span>" +
      '<span class="group-line"></span></div>' +
      '<div class="grid">' + sub.map(o => cardHtml(o.x, o.i, 0)).join("") + "</div></div>";
  });

  h += '<div class="empty" id="emptyState" style="display:none">' +
    '<div class="empty-ico">🔍</div><div class="empty-t">没有找到匹配的内容</div>' +
    '<div class="empty-s">试试换个关键词</div></div>';

  const out = layout({
    title: SITE.title + " · " + SITE.subtitle,
    desc: SITE.title + " —— " + SITE.subtitle + "，共 " + ITEMS.length + " 条内容，由 " + SITE.author + " 维护。",
    content: h,
    depth: 0,
    canonical: "https://juheaidh.pages.dev/",
    crumb: "<b>全部内容</b>",
  });
  fs.writeFileSync(path.join(NAV, "index.html"), out, "utf8");
  console.log("生成 index.html");
}

/* ---------- 详情页 ---------- */
PLAN.forEach(p => {
  const it = ITEMS[p.idx];
  const depth = 1;
  const R = rel(depth);
  const canonical = "https://juheaidh.pages.dev/" + p.url;
  const crumb = '<a href="' + R + 'index.html">首页</a><span class="sep">/</span>' +
    '<a href="' + R + 'index.html#' + encodeURIComponent(it.group) + '">' + esc(it.group) + '</a>' +
    '<span class="sep">/</span><b>' + esc(it.title) + "</b>";

  let content = "";

  if (it.type === "link") {
    const host = (() => { try { return new URL(it.url).hostname; } catch (e) { return it.url; } })();
    content += '<div class="detail-wrap">';
    content += '<section class="hero"><div class="hero-inner">' +
      iconHtml(it, "hero-ico") +
      '<div class="hero-main"><h1>' + esc(it.title) + '</h1>' +
      '<div class="hero-sub">' + esc(it.desc || "") + '</div>' +
      (it.tags && it.tags.length ? '<div class="hero-tags">' + it.tags.map(t => '<span class="tag">' + esc(t) + "</span>").join("") + '</div>' : "") +
      '</div></div><div class="hero-actions">' +
      '<a class="btn btn-lg" href="' + esc(it.url) + '" target="_blank" rel="noopener">🚀 访问网站</a>' +
      '<button class="btn btn-ghost btn-lg" data-copy="' + esc(it.url) + '">📋 复制链接</button>' +
      '<a class="btn btn-ghost btn-lg" href="' + R + 'index.html">← 返回列表</a>' +
      '</div></section>';

    content += '<div class="panel"><div class="panel-head">网站信息</div><div class="meta-grid">' +
      '<div class="meta-cell"><div class="meta-k">域名</div><div class="meta-v"><code>' + esc(host) + '</code></div></div>' +
      '<div class="meta-cell"><div class="meta-k">所属板块</div><div class="meta-v">' + esc(it.group) + '</div></div>' +
      '<div class="meta-cell"><div class="meta-k">内容类型</div><div class="meta-v">外部链接</div></div>' +
      (it.tags && it.tags.length ? '<div class="meta-cell"><div class="meta-k">标签</div><div class="meta-v">' + esc(it.tags.join(" / ")) + '</div></div>' : "") +
      '</div></div>';

    content += '<div class="panel"><div class="panel-head">这个网站能做什么</div><p>' + esc(it.desc || "暂无简介") + '</p>';
    if (it.detail) content += '<p>' + esc(it.detail) + '</p>';
    content += '</div>';

    if (it.points && it.points.length) {
      content += '<div class="panel"><div class="panel-head">使用要点</div><div class="feat-grid">' +
        it.points.map(x => '<div class="feat"><div class="feat-ico">✓</div><div class="feat-txt">' + esc(x) + '</div></div>').join("") +
        '</div></div>';
    }

    content += '<div class="panel"><div class="panel-head">访问地址</div>' +
      '<div class="meta-grid"><div class="meta-cell"><div class="meta-v"><code>' + esc(it.url) + '</code></div></div></div>' +
      '<p style="margin-top:14px;font-size:13px">点击「访问网站」会在新窗口打开。如果打不开，先检查网络或代理设置。</p></div>';

    const rel = PLAN.filter(o => o.idx !== p.idx && o.group === it.group).slice(0, 3);
    if (rel.length) {
      content += '<div class="related"><div class="related-t">同板块的其他内容</div><div class="grid">' +
        rel.map(o => cardHtml(ITEMS[o.idx], o.idx, depth)).join("") + '</div></div>';
    }
    content += '</div>';
  } else {
    // 文章页
    const r = md(it.body || "");
    const sibs = PLAN.filter(o => ITEMS[o.idx].type === "article" && ITEMS[o.idx].group === it.group);
    const pos = sibs.findIndex(o => o.idx === p.idx);
    const prev = pos > 0 ? sibs[pos - 1] : null;
    const next = pos >= 0 && pos < sibs.length - 1 ? sibs[pos + 1] : null;

    const tocHtml = r.toc.length
      ? r.toc.map(t => '<a href="#' + t.id + '" data-toc="' + t.id + '" class="' + (t.lv === 3 ? "h3" : "") + '">' + esc(t.t) + '</a>').join("")
      : "";

    content += '<div class="detail-wrap"><div class="article-layout"><div class="article-main">';

    content += '<div class="article-hero"><div class="kicker">📘 ' + esc(it.group) + '</div>' +
      '<h1>' + esc(it.title) + '</h1>' +
      (it.desc ? '<div class="lead">' + esc(it.desc) + '</div>' : "") +
      '<div class="article-meta">' +
      (it.date ? '<span class="m">🗓 ' + esc(it.date) + '</span><span class="dot"></span>' : "") +
      (it.read ? '<span class="m">⏱ 约 ' + it.read + ' 分钟</span>' : "") +
      (r.toc.length ? '<span class="dot"></span><span class="m">📑 ' + r.toc.length + ' 个小节</span>' : "") +
      '</div></div>';

    if (tocHtml) content += '<details class="toc-bar"><summary>📑 本文目录</summary><div class="toc toc-m"><div class="toc-t">目录</div>' + tocHtml + '</div></details>';

    content += '<article class="article" id="articleBody">' + r.html + '</article>';

    content += '<div class="pager">' +
      (prev
        ? '<a class="pager-btn prev" href="' + R + prev.url + '"><span class="pager-lbl">← 上一篇</span><span class="pager-title">' + esc(ITEMS[prev.idx].title) + '</span></a>'
        : '<div class="pager-btn prev pager-empty"><span class="pager-lbl">← 上一篇</span><span class="pager-title">已经是第一篇</span></div>') +
      (next
        ? '<a class="pager-btn next" href="' + R + next.url + '"><span class="pager-lbl">下一篇 →</span><span class="pager-title">' + esc(ITEMS[next.idx].title) + '</span></a>'
        : '<div class="pager-btn next pager-empty"><span class="pager-lbl">下一篇 →</span><span class="pager-title">已经是最后一篇</span></div>') +
      '</div>';

    const rel = sibs.filter(o => o.idx !== p.idx).slice(0, 3);
    if (rel.length) {
      content += '<div class="related"><div class="related-t">同类内容</div><div class="grid">' +
        rel.map(o => cardHtml(ITEMS[o.idx], o.idx, depth)).join("") + '</div></div>';
    }

    content += '</div><aside class="toc toc-d">' + (tocHtml ? '<div class="toc-t">目录</div>' + tocHtml : "") + '</aside></div></div>';
  }

  const out = layout({
    title: it.title + " - " + SITE.title,
    desc: (it.desc || it.title) + " —— " + SITE.title,
    content,
    depth,
    activeGroup: it.group,
    canonical,
    crumb,
  });

  const outPath = path.join(NAV, p.url);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out, "utf8");
  console.log("生成 " + p.url);
});

console.log("\n✅ 全部完成：1 个首页 + " + PLAN.length + " 个详情页");
