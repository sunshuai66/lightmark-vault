(() => {
  const DB_NAME = "qinghua-mobile-vault";
  const DB_VERSION = 1;
  const ACTIVE_PROJECT_KEY = "activeProjectId";
  let databasePromise;

  function storageError(error, fallback) {
    const messages = {
      QuotaExceededError: "本机收集箱空间不足，未完成保存。请先导出，并腾出浏览器空间后重试。",
      SecurityError: "浏览器不允许使用本地收集箱。请在正常浏览模式下打开，并允许网站保存数据。",
      NotAllowedError: "浏览器不允许使用本地收集箱。请在正常浏览模式下打开，并允许网站保存数据。",
      InvalidStateError: "本地收集箱暂时不可用，请关闭其他轻划收集页后重新打开。",
      VersionError: "本地收集箱版本不兼容，请使用更新后的轻划收集页。",
      AbortError: "本次本地操作已取消，请重试。",
      ConstraintError: "项目名称或摘录已存在，请重新选择后重试。"
    };
    if (messages[error?.name]) return new Error(messages[error.name]);
    if (error?.name === "Error" && error.message) return error;
    return new Error(fallback);
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;
    let attempt;
    attempt = new Promise((resolve, reject) => {
      if (!globalThis.indexedDB) {
        reject(new Error("这个浏览器没有可用的本地数据库，请换用正常浏览模式后重试。"));
        return;
      }
      let settled = false;
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        const clips = db.createObjectStore("clips", { keyPath: "id" });
        clips.createIndex("projectAndTime", ["projectId", "capturedAt"], { unique: false });
        const projects = db.createObjectStore("projects", { keyPath: "id" });
        projects.createIndex("nameKey", "nameKey", { unique: true });
        db.createObjectStore("settings", { keyPath: "key" });
      };
      request.onblocked = () => {
        settled = true;
        reject(new Error("收集箱正在等待其他页面释放数据库，请关闭其他轻划收集页后重试。"));
      };
      request.onerror = () => {
        settled = true;
        reject(storageError(request.error, "无法打开本地收集箱，请重新打开页面后重试。"));
      };
      request.onsuccess = () => {
        const db = request.result;
        if (settled) {
          db.close();
          return;
        }
        settled = true;
        db.onversionchange = () => {
          db.close();
          if (databasePromise === attempt) databasePromise = undefined;
        };
        db.onclose = () => {
          if (databasePromise === attempt) databasePromise = undefined;
        };
        resolve(db);
      };
    }).catch((error) => {
      if (databasePromise === attempt) databasePromise = undefined;
      throw storageError(error, "无法打开本地收集箱。请重新打开页面后重试。");
    });
    databasePromise = attempt;
    return attempt;
  }

  // No asynchronous work runs inside a transaction. Request callbacks queue
  // their next request synchronously, including on Safari.
  async function transact(stores, mode, work) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      let tx;
      let result;
      let failure;
      let finished = false;
      const fail = (error) => {
        if (finished) return;
        failure ||= error;
        try {
          tx.abort();
        } catch {
          finished = true;
          reject(storageError(failure, "本地收集箱操作失败，请重试。"));
        }
      };
      try {
        tx = db.transaction(stores, mode);
      } catch (error) {
        reject(storageError(error, "无法访问本地收集箱，请重新打开页面后重试。"));
        return;
      }
      tx.oncomplete = () => {
        if (finished) return;
        finished = true;
        resolve(result);
      };
      tx.onabort = () => {
        if (finished) return;
        finished = true;
        reject(storageError(failure || tx.error, "本地收集箱操作未完成，请重试。"));
      };
      tx.onerror = (event) => {
        failure ||= event.target?.error || tx.error;
      };
      const read = (request, callback) => {
        request.onsuccess = () => {
          if (finished) return;
          try {
            callback(request.result);
          } catch (error) {
            fail(error);
          }
        };
        request.onerror = () => fail(request.error);
      };
      try {
        work(tx, (value) => { result = value; }, fail, read);
      } catch (error) {
        fail(error);
      }
    });
  }

  const projectOrder = (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

  async function initialize() {
    return transact(["projects", "settings"], "readwrite", (tx, done, fail, read) => {
      const projectStore = tx.objectStore("projects");
      const settingsStore = tx.objectStore("settings");
      read(projectStore.getAll(), (projects) => {
        if (!projects.length) {
          const project = { id: "inbox", name: "收集箱", nameKey: "收集箱", createdAt: new Date().toISOString() };
          projectStore.add(project);
          projects.push(project);
        }
        projects.sort(projectOrder);
        read(settingsStore.get(ACTIVE_PROJECT_KEY), (setting) => {
          const activeProjectId = projects.some((project) => project.id === setting?.value)
            ? setting.value : projects[0].id;
          if (setting?.value !== activeProjectId) {
            settingsStore.put({ key: ACTIVE_PROJECT_KEY, value: activeProjectId });
          }
          done({ projects, activeProjectId });
        });
      });
    });
  }

  function projectName(rawName) {
    const name = String(rawName ?? "").trim().replace(/\s+/g, " ");
    if (!name) throw new Error("请输入项目名称。");
    if ([...name].length > 40) throw new Error("项目名称最多 40 个字，请缩短后重试。");
    return name;
  }

  function requireProjectId(id) {
    if (typeof id !== "string" || !id) throw new Error("请先选择一个项目。");
    return id;
  }

  async function createProject(rawName) {
    const name = projectName(rawName);
    const nameKey = name.normalize("NFKC").toLowerCase();
    await initialize();
    const project = {
      id: globalThis.crypto?.randomUUID?.() || `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
      name,
      nameKey,
      createdAt: new Date().toISOString()
    };
    return transact(["projects", "settings"], "readwrite", (tx, done, fail, read) => {
      const store = tx.objectStore("projects");
      read(store.index("nameKey").get(nameKey), (existing) => {
        if (existing) {
          fail(new Error("已经有同名项目了，请换个名称。"));
          return;
        }
        store.add(project);
        tx.objectStore("settings").put({ key: ACTIVE_PROJECT_KEY, value: project.id });
        done(project);
      });
    });
  }

  async function setActiveProject(rawId) {
    const id = requireProjectId(rawId);
    await initialize();
    return transact(["projects", "settings"], "readwrite", (tx, done, fail, read) => {
      read(tx.objectStore("projects").get(id), (project) => {
        if (!project) {
          fail(new Error("没有找到这个项目，请重新选择。"));
          return;
        }
        tx.objectStore("settings").put({ key: ACTIVE_PROJECT_KEY, value: id });
        done(project);
      });
    });
  }

  async function listClips(rawProjectId) {
    const id = requireProjectId(rawProjectId);
    return transact(["clips"], "readonly", (tx, done, fail, read) => {
      const range = IDBKeyRange.bound([id, ""], [id, "\uffff"]);
      read(tx.objectStore("clips").index("projectAndTime").getAll(range), (clips) => {
        clips.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt) || a.id.localeCompare(b.id));
        done(clips);
      });
    });
  }

  async function addClip(source, rawProjectId) {
    const projectId = requireProjectId(rawProjectId);
    if (!source || typeof source.id !== "string" || !source.id || source.id.length > 200) {
      throw new Error("这条摘录缺少有效编号，请从原网页重新收录。");
    }
    if (typeof source.text !== "string" || !source.text.trim()) {
      throw new Error("这条摘录没有正文，请重新划选文字。");
    }
    const date = new Date(source.capturedAt);
    if (!Number.isFinite(date.getTime())) throw new Error("这条摘录的收录时间无效，请重新收录。");
    const clip = {
      id: source.id,
      projectId,
      text: source.text,
      title: String(source.title || "无标题网页"),
      url: String(source.url || ""),
      capturedAt: date.toISOString()
    };
    return transact(["projects", "clips"], "readwrite", (tx, done, fail, read) => {
      read(tx.objectStore("projects").get(projectId), (project) => {
        if (!project) {
          fail(new Error("没有找到保存项目，请先选择或新建项目。"));
          return;
        }
        const store = tx.objectStore("clips");
        read(store.get(clip.id), (existing) => {
          if (existing) {
            done({ clip: existing, duplicate: true });
            return;
          }
          store.add(clip);
          done({ clip, duplicate: false });
        });
      });
    });
  }

  globalThis.QinghuaVaultStore = Object.freeze({
    initialize,
    createProject,
    setActiveProject,
    listClips,
    addClip
  });
})();
