(() => {
  // Each full chunk contains a multiple of 3 bytes, so only the last one can
  // contain Base64 padding. Small chunks also avoid large argument lists.
  const CHUNK_BYTES = 3 * 8192;

  function filename(projectName, extension) {
    const name = String(projectName || "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .replace(/^[. ]+|[. ]+$/g, "") || "轻划摘录";
    return `${name}.${extension}`;
  }

  async function prepare(blob, projectName, extension) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const chunks = [];
    for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
      const chunk = bytes.subarray(offset, offset + CHUNK_BYTES);
      chunks.push(btoa(String.fromCharCode(...chunk)));
    }
    // This URL contains the file itself. It does not depend on a popup-owned
    // Blob URL, and octet-stream requests a download rather than a preview.
    return {
      href: `data:application/octet-stream;base64,${chunks.join("")}`,
      filename: filename(projectName, extension)
    };
  }

  globalThis.ScrapbookDownload = { prepare };
})();
