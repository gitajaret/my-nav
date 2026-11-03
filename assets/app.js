/* 聚合导航 · 多页面版共用脚本 */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- 主题 ---------- */
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("nav-theme", t);
  const b = document.getElementById("themeBtn");
  if (b) b.textContent = t === "light" ? "🌙" : "☀️";
}
(function () {
  const saved = localStorage.getItem("nav-theme");
  const auto = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  applyTheme(saved || auto);
})();

/* ---------- 提示条 ---------- */
let toastTimer;
function toast(msg, ok) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.innerHTML = (ok ? "✅ " : "") + esc(msg);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1900);
}

/* ---------- 侧栏（移动端） ---------- */
function closeSidebar() {
  document.body.classList.remove("sidebar-open");
}

document.addEventListener("click", (e) => {
  const t = e.target;

  // 复制
  const copyBtn = t.closest("[data-copy]");
  if (copyBtn) {
    const v = copyBtn.getAttribute("data-copy");
    const done = () => toast("已复制：" + v, true);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(v).then(done, () => toast("复制失败，请手动选择", false));
    } else {
      const ta = document.createElement("textarea");
      ta.value = v; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (_) { toast("复制失败", false); }
      document.body.removeChild(ta);
    }
    return;
  }

  // 主题
  if (t.closest("#themeBtn")) {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(cur === "light" ? "dark" : "light");
    return;
  }

  // 菜单
  if (t.closest("#menuBtn")) { document.body.classList.add("sidebar-open"); return; }
  if (t.closest("#mask")) { closeSidebar(); return; }

  // 打印
  if (t.closest("#printBtn")) { window.print(); return; }

  // 回到顶部
  if (t.closest("#toTop")) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }

  // 侧栏链接点击后关闭
  if (t.closest(".sidebar a")) closeSidebar();

  // 目录锚点
  const toc = t.closest("[data-toc]");
  if (toc) {
    const id = toc.getAttribute("data-toc");
    const el = document.getElementById(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); history.replaceState(null, "", "#" + id); }
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "t" || e.key === "T") {
    if (/input|textarea/i.test((e.target.tagName || ""))) return;
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(cur === "light" ? "dark" : "light");
  }
  if (e.key === "h" || e.key === "H") {
    if (/input|textarea/i.test((e.target.tagName || ""))) return;
    location.href = document.querySelector(".brand") ? location.pathname.replace(/[^/]*$/, "") + "index.html" : "index.html";
  }
});

/* ---------- 回到顶部按钮显隐 ---------- */
(function () {
  const btn = document.getElementById("toTop");
  if (!btn) return;
  const onScroll = () => {
    if (window.scrollY > 400) btn.classList.add("show");
    else btn.classList.remove("show");
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* ---------- 阅读进度 ---------- */
(function () {
  const bar = document.getElementById("progress");
  const body = document.getElementById("articleBody");
  if (!bar || !body) return;
  const onScroll = () => {
    const top = body.offsetTop;
    const h = body.offsetHeight;
    const seen = window.scrollY - top + window.innerHeight * 0.3;
    const pct = Math.max(0, Math.min(1, seen / h));
    bar.style.width = (pct * 100) + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* ---------- 目录高亮 ---------- */
(function () {
  const links = document.querySelectorAll(".toc-d a[data-toc]");
  if (!links.length) return;
  const heads = [...links].map(a => document.getElementById(a.getAttribute("data-toc"))).filter(Boolean);
  if (!heads.length) return;
  const onScroll = () => {
    let cur = heads[0];
    for (const h of heads) {
      if (h.getBoundingClientRect().top <= 120) cur = h;
    }
    links.forEach(a => a.classList.toggle("on", a.getAttribute("data-toc") === cur.id));
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* ---------- 首页搜索 ---------- */
(function () {
  const input = document.getElementById("q");
  if (!input) return;
  const groups = [...document.querySelectorAll(".group")];
  const cards = [...document.querySelectorAll(".card")];
  const empty = document.getElementById("emptyState");

  const run = () => {
    const k = input.value.trim().toLowerCase();
    if (!k) {
      cards.forEach(c => c.style.display = "");
      groups.forEach(g => g.style.display = "");
      if (empty) empty.style.display = "none";
      return;
    }
    cards.forEach(c => {
      const hit = (c.textContent || "").toLowerCase().includes(k);
      c.style.display = hit ? "" : "none";
    });
    let total = 0;
    groups.forEach(g => {
      const shown = [...g.querySelectorAll(".card")].filter(c => c.style.display !== "none").length;
      g.style.display = shown ? "" : "none";
      total += shown;
    });
    if (empty) empty.style.display = total ? "none" : "";
  };

  input.addEventListener("input", run);
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|textarea/i.test(e.target.tagName || "")) {
      e.preventDefault(); input.focus();
    }
  });
})();
