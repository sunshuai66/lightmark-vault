(() => {
  const input = document.getElementById("policyUrl");
  const button = document.getElementById("copyPolicyUrl");
  const status = document.getElementById("policyUrlStatus");
  const url = new URL("./privacy.html", location.href);
  url.search = "";
  url.hash = "";
  input.value = url.href;
  if (url.protocol === "https:") {
    button.disabled = false;
    status.textContent = "复制下方网址，填入 Chrome / Edge 商店后台的隐私政策 URL。";
  } else {
    status.textContent = "当前是本地预览地址，不能用于商店提交。部署到固定 HTTPS 域名后，可在这里复制实际政策网址。";
  }
  button.addEventListener("click", async () => {
    try {
      try { await navigator.clipboard.writeText(input.value); }
      catch {
        input.focus(); input.select(); input.setSelectionRange(0, input.value.length);
        if (!document.execCommand("copy")) throw new Error("复制不可用");
      }
      status.textContent = "已复制隐私政策网址。提交前请确认未登录时也能访问。";
    } catch {
      status.textContent = "请长按上方网址全选并复制。";
    }
  });
})();
