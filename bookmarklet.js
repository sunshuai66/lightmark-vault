(() => {
  function capture(vaultUrl) {
    try {
      let text = "";
      const active = document.activeElement;
      if (active && (active.tagName === "TEXTAREA" || (active.tagName === "INPUT" && /^(text|search|url|email|tel)$/i.test(active.type)))) {
        const start = active.selectionStart, end = active.selectionEnd;
        if (Number.isInteger(start) && Number.isInteger(end) && end > start) text = active.value.slice(start, end);
      }
      if (!text.trim()) text = String(window.getSelection() || "");
      if (!text.trim()) { alert("轻划：请先选中网页文字，再点「轻划手机收录」书签。本次没有保存。"); return; }
      if (!/^https?:$/.test(location.protocol)) { alert("轻划：请在普通网页中使用。本次没有保存。"); return; }
      const source = new URL(location.href);
      source.username = "";
      source.password = "";
      const clip = {
        v: 1,
        id: globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2),
        text,
        title: (document.title || "无标题网页").slice(0, 2000),
        url: source.href,
        capturedAt: new Date().toISOString()
      };
      const bytes = new TextEncoder().encode(JSON.stringify(clip));
      if (text.length > 50000 || bytes.length > 48000) {
        alert("轻划：这段内容较长，请拆成几段收录（每段约一万字以内）。本次没有保存，也没有截断文字。");
        return;
      }
      const chunks = [];
      for (let i = 0; i < bytes.length; i += 24576) chunks.push(btoa(String.fromCharCode(...bytes.subarray(i, i + 24576))));
      const encoded = chunks.join("").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      location.assign(vaultUrl + "#clip=" + encoded);
    } catch (error) {
      alert("轻划：未能打开收集页，本次没有保存。" + (error?.message || ""));
    }
  }

  function canonicalUrl(value) {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("请使用真实的 HTTPS 收集页地址。");
    if (/your-host|\.example$/i.test(url.hostname)) throw new Error("请先部署，不能使用示例占位地址。");
    if (url.search || url.hash) throw new Error("收集页地址不能带查询参数或 # 后的内容。");
    if (url.pathname.endsWith("/")) url.pathname += "vault.html";
    else if (url.pathname.endsWith("/index.html")) url.pathname = url.pathname.replace(/index\.html$/, "vault.html");
    else if (!url.pathname.endsWith("/vault.html")) {
      if (/\.[^/]+$/.test(url.pathname)) throw new Error("请使用 vault.html 的访问地址。");
      url.pathname += "/vault.html";
    }
    return url.href;
  }

  function create(value) {
    const url = canonicalUrl(value);
    const source = capture.toString().replace(/\n\s*/g, "");
    return "javascript:" + encodeURIComponent("(" + source + ")(" + JSON.stringify(url) + ");void 0;");
  }

  function validate(value) {
    if (!value || value.v !== 1 || typeof value.id !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(value.id)) throw new Error("摘录格式不正确，请重新划选后收录。");
    if (typeof value.text !== "string" || !value.text.trim() || value.text.length > 50000) throw new Error("摘录为空或过长，本次未保存。");
    if (typeof value.title !== "string" || value.title.length > 2000 || typeof value.url !== "string" || value.url.length > 12000) throw new Error("摘录来源格式不正确，本次未保存。");
    const source = new URL(value.url);
    if (!/^https?:$/.test(source.protocol)) throw new Error("只接受普通网页的来源链接。");
    source.username = "";
    source.password = "";
    if (typeof value.capturedAt !== "string" || !Number.isFinite(Date.parse(value.capturedAt))) throw new Error("摘录时间无效，本次未保存。");
    return { v: 1, id: value.id, text: value.text, title: value.title || "无标题网页", url: source.href, capturedAt: new Date(value.capturedAt).toISOString() };
  }

  function decodeFragment(hash) {
    if (!hash || hash === "#") return null;
    if (!hash.startsWith("#clip=") || hash.length > 65000) throw new Error("收录地址不完整或过长，请重新收录。");
    const encoded = hash.slice(6);
    if (!encoded || !/^[a-zA-Z0-9_-]+$/.test(encoded)) throw new Error("收录地址已损坏，本次未保存。");
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64 + "=".repeat((4 - base64.length % 4) % 4)), char => char.charCodeAt(0));
    return validate(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
  }

  globalThis.QinghuaBookmarklet = { create, canonicalUrl, validate, decodeFragment };
})();
