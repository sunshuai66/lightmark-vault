(() => {
  function localTimestamp(isoString) {
    const date = new Date(isoString);
    const pad = (number) => String(number).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  function safeMarkdownUrl(value) {
    try {
      const url = new URL(String(value || ""));
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return url.href.replace(/[() ]/g, (char) => ({ "(": "%28", ")": "%29", " ": "%20" })[char]);
    } catch {
      return "";
    }
  }

  function escapeMarkdown(value) {
    return String(value).replace(/[\\`*_{}\[\]()#+.!|>~-]/g, "\\$&");
  }

  function formatClip(clip) {
    const title = String(clip.title || "无标题网页").replace(/[\r\n]+/g, " ").trim();
    const text = String(clip.text || "").replace(/\r\n/g, "\n").trim();
    const quote = text.split("\n").map((line) => "> " + line).join("\n");
    const url = safeMarkdownUrl(clip.url);
    const source = url ? "[" + escapeMarkdown(title) + "](<" + url + ">)" : escapeMarkdown(title);
    return quote + "\n> \n> 📌 来源：" + source + "  ·  ⏱ " + localTimestamp(clip.capturedAt) + "\n";
  }

  function markdownDocument(project, clips) {
    const ordered = [...clips].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    const name = String(project?.name || "收集箱").replace(/[\r\n]+/g, " ");
    const date = localTimestamp(new Date().toISOString()).slice(0, 10);
    const header = "# " + escapeMarkdown(name) + " 摘录集\n\n> 📁 当前项目：" + name + "　·　📊 共收录 " + ordered.length + " 条摘录　·　⏱ 导出时间：" + date + "\n";
    const cards = ordered.map((clip, index) => "\n### " + String(index + 1).padStart(2, "0") + " · " + escapeMarkdown(String(clip.title || "无标题网页").replace(/[\r\n]+/g, " ")) + "\n\n" + formatClip(clip)).join("\n");
    return header + cards + "\n";
  }

  globalThis.ScrapbookFormat = { localTimestamp, formatClip, markdownDocument };
})();
