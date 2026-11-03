(() => {
  const byId = id => document.getElementById(id);
  const status = byId("status"), select = byId("projectSelect");
  const pendingKey = "qinghua-pending-v1:" + new URL("./", location.href).pathname;
  const outputLinks = [
    { node: byId("exportWord"), type: "docx", label: "Word" },
    { node: byId("exportMarkdown"), type: "md", label: "Markdown" }
  ];
  let state, pending = [], saving = false, revision = 0;

  function message(text, kind = "") {
    status.textContent = text;
    status.className = "notice " + kind;
  }

  if (window.top !== window.self) {
    message("请在浏览器的独立页面打开轻划收集箱。嵌入网页时不会收录。", "error");
    return;
  }

  function persistPending() {
    try {
      if (pending.length) sessionStorage.setItem(pendingKey, JSON.stringify(pending));
      else sessionStorage.removeItem(pendingKey);
    } catch { /* IndexedDB is the primary store; keep an unsaved clip in memory. */ }
  }

  function pendingView() {
    byId("pendingPanel").hidden = pending.length === 0;
    const clip = pending[0];
    byId("pendingText").value = clip
      ? clip.text + "\n\n📌 来源：" + clip.title + " (" + clip.url + ") | 摘录时间：" + ScrapbookFormat.localTimestamp(clip.capturedAt)
      : "";
  }

  function readFragment() {
    const hash = location.hash;
    if (!hash || hash === "#") return;
    // The fragment is never sent in the HTTP request; also remove it from
    // this history entry before decoding or waiting for storage.
    history.replaceState(null, "", location.pathname + location.search);
    try {
      const clip = QinghuaBookmarklet.decodeFragment(hash);
      if (clip && !pending.some(item => item.id === clip.id)) pending.push(clip);
      persistPending();
    } catch {
      message("收录地址无法读取，可能不完整或内容过长。请回网页重新收录，本次未保存。", "error");
    }
    pendingView();
  }

  try {
    const previous = JSON.parse(sessionStorage.getItem(pendingKey) || "[]");
    if (Array.isArray(previous)) pending = previous.map(QinghuaBookmarklet.validate);
  } catch { message("上次待存摘录未能恢复，请重新划选收录。", "error"); }
  readFragment();
  pendingView();

  function controls(disabled) {
    select.disabled = disabled;
    byId("projectName").disabled = disabled;
    byId("addProject").disabled = disabled;
    byId("retrySave").disabled = disabled;
  }

  function disableDownloads() {
    for (const item of outputLinks) {
      item.ready = false;
      item.node.removeAttribute("href");
      item.node.removeAttribute("download");
      item.node.setAttribute("aria-disabled", "true");
      item.node.setAttribute("tabindex", "-1");
      item.node.title = "项目为空或文件正在准备中";
    }
  }

  for (const item of outputLinks) item.node.addEventListener("click", event => {
    if (!item.ready) {
      event.preventDefault();
      message("项目为空，或文件还在准备中，请稍后再试。");
    } else message(`正在下载 ${item.node.download}，请查看浏览器的下载列表。`);
  });

  function sourceLink(url, title, className) {
    let safeUrl = "";
    try { const parsed = new URL(url); if (/^https?:$/.test(parsed.protocol)) safeUrl = parsed.href; } catch {}
    const node = document.createElement(safeUrl ? "a" : "span");
    node.textContent = title;
    node.className = className;
    if (safeUrl) { node.href = safeUrl; node.target = "_blank"; node.rel = "noopener noreferrer"; }
    return node;
  }

  async function render() {
    const current = ++revision;
    disableDownloads();
    const project = state.projects.find(item => item.id === state.activeProjectId);
    select.replaceChildren();
    for (const item of state.projects) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      select.append(option);
    }
    select.value = project.id;
    const clips = await QinghuaVaultStore.listClips(project.id);
    if (current !== revision) return;
    byId("clipCount").textContent = `${clips.length} 条摘录`;
    const list = byId("clips");
    list.replaceChildren();
    if (!clips.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "还没有摘录。先设置下方的手机书签，再去网页划选文字。";
      list.append(empty);
      byId("setup").open = true;
      return;
    }
    clips.forEach((clip, index) => {
      const article = document.createElement("article");
      article.className = "clip";
      const top = document.createElement("div"), number = document.createElement("span");
      top.className = "clip-top";
      number.className = "clip-number";
      number.textContent = String(index + 1).padStart(2, "0");
      top.append(number, sourceLink(clip.url, clip.title, "clip-title"));
      const body = document.createElement("p");
      body.className = "clip-body";
      body.textContent = clip.text;
      const metadata = document.createElement("div"), time = document.createElement("time");
      metadata.className = "clip-meta";
      metadata.append(sourceLink(clip.url, "🔗 " + clip.url, ""));
      time.dateTime = clip.capturedAt;
      time.textContent = "收录于 " + ScrapbookFormat.localTimestamp(clip.capturedAt);
      metadata.append(time);
      article.append(top, body, metadata);
      list.append(article);
    });
    await Promise.all(outputLinks.map(async item => {
      try {
        const blob = item.type === "docx" ? await ScrapbookDocx.create(project, clips)
          : new Blob([ScrapbookFormat.markdownDocument(project, clips)], { type: "text/markdown;charset=utf-8" });
        const file = await ScrapbookDownload.prepare(blob, project.name, item.type);
        if (current !== revision) return;
        item.node.href = file.href;
        item.node.download = file.filename;
        item.node.setAttribute("aria-disabled", "false");
        item.node.removeAttribute("tabindex");
        item.node.title = "保存 " + file.filename;
        item.ready = true;
      } catch (error) {
        if (current === revision) message(`${item.label} 文档准备失败：${error.message || "请重试"}`, "error");
      }
    }));
  }

  async function consumePending() {
    if (!state || saving) return;
    saving = true;
    controls(true);
    try {
      while (pending.length) {
        const result = await QinghuaVaultStore.addClip(pending[0], state.activeProjectId);
        pending.shift();
        persistPending();
        const project = state.projects.find(item => item.id === result.clip.projectId);
        message(result.duplicate ? `这条摘录已经收录在「${project?.name || "原项目"}」中，没有重复添加。`
          : `已收录到「${project?.name || "当前项目"}」。可用浏览器返回键继续阅读。`, "success");
      }
    } catch (error) {
      message(`尚未保存：${error.message || "本机存储不可用"}。请保持本页打开重试，或先复制摘录。`, "error");
    } finally {
      saving = false;
      controls(false);
      pendingView();
      await render();
    }
  }

  async function start() {
    try {
      state = await QinghuaVaultStore.initialize();
      if (!pending.length && !status.classList.contains("error")) message("本机收集箱已就绪。所有摘录按收录时间排列。");
      await consumePending();
    } catch (error) {
      controls(true);
      byId("retrySave").disabled = false;
      message(`未能打开本机收集箱：${error.message || "请使用普通浏览窗口后重试"}。本次未保存。`, "error");
      pendingView();
    }
  }

  select.addEventListener("change", async () => {
    ++revision;
    disableDownloads();
    controls(true);
    try {
      await QinghuaVaultStore.setActiveProject(select.value);
      state.activeProjectId = select.value;
      message("已切换项目。");
      await render();
    } catch (error) { message(error.message || "切换项目失败。", "error"); await render(); }
    finally { controls(false); }
  });

  byId("projectForm").addEventListener("submit", async event => {
    event.preventDefault();
    controls(true);
    ++revision;
    disableDownloads();
    try {
      const project = await QinghuaVaultStore.createProject(byId("projectName").value);
      state = await QinghuaVaultStore.initialize();
      byId("projectName").value = "";
      message(`已切换到「${project.name}」。`);
      await render();
    } catch (error) { message(error.message || "新建项目失败。", "error"); await render(); }
    finally { controls(false); }
  });

  byId("retrySave").addEventListener("click", () => { (state ? consumePending() : start()).catch(error => message(error.message, "error")); });
  window.addEventListener("hashchange", () => { readFragment(); consumePending().catch(error => message(error.message, "error")); });
  window.addEventListener("pageshow", event => { if (event.persisted && !saving) start(); });

  async function copy(text, textarea) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      if (!document.execCommand("copy")) throw new Error("请长按下方文本，全选后复制。");
    }
  }

  byId("copyPending").addEventListener("click", async () => {
    try { await copy(byId("pendingText").value, byId("pendingText")); message("已复制待存摘录，可先粘贴到备忘录保存。"); }
    catch (error) { message(error.message, "error"); }
  });

  const vault = new URL("./vault.html", location.href);
  vault.search = "";
  vault.hash = "";
  byId("vaultAddress").href = vault.href;
  byId("vaultAddress").textContent = vault.href;
  try {
    byId("bookmarkletCode").value = QinghuaBookmarklet.create(vault.href);
    byId("copyBookmarklet").disabled = false;
    byId("setupStatus").textContent = "代码已自动使用上面的访问地址，无需替换占位符。请固定使用生产域名。";
  } catch {
    byId("setupStatus").textContent = "当前是本地预览。部署到固定 HTTPS 地址后，这里会自动生成可用书签代码。";
  }
  byId("copyBookmarklet").addEventListener("click", async () => {
    try {
      await copy(byId("bookmarkletCode").value, byId("bookmarkletCode"));
      byId("setupStatus").textContent = "已复制。请粘贴到“轻划手机收录”书签的网址里，保留 javascript: 开头。";
    } catch (error) { byId("setupStatus").textContent = error.message; }
  });
  start();
})();
