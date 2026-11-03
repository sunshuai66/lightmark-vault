(() => {
  const encoder = new TextEncoder();
  const mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const esc = (value) => String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const p = (value, style = "CardBody") => {
    const pieces = String(value || " ").split("\t");
    const runs = pieces.map((piece, index) => (index ? "<w:r><w:tab/></w:r>" : "") + '<w:r><w:t xml:space="preserve">' + esc(piece) + "</w:t></w:r>").join("");
    return '<w:p><w:pPr><w:pStyle w:val="' + style + '"/></w:pPr>' + runs + "</w:p>";
  };

  function exportDate() {
    return ScrapbookFormat.localTimestamp(new Date().toISOString()).slice(0, 10);
  }

  function cardCell(content) {
    return '<w:tbl><w:tblPr><w:tblW w:w="8800" w:type="dxa"/><w:tblInd w:w="120" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:top w:w="180" w:type="dxa"/><w:left w:w="220" w:type="dxa"/><w:bottom w:w="180" w:type="dxa"/><w:right w:w="220" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="8800"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="8800" w:type="dxa"/><w:shd w:fill="F9F9FB" w:val="clear"/></w:tcPr>' + content + '</w:tc></w:tr></w:tbl>';
  }

  function headerBadge(project, count) {
    const date = exportDate();
    const line = '<w:p><w:pPr><w:pStyle w:val="HeaderBadge"/></w:pPr>' +
      '<w:r><w:t>📁 当前项目：</w:t></w:r><w:r><w:rPr><w:b/><w:color w:val="222222"/></w:rPr><w:t xml:space="preserve">[' + esc(project.name) + ']</w:t></w:r>' +
      '<w:r><w:t xml:space="preserve">  ·  📊 共收录 ' + count + ' 条摘录  ·  ⏱ 导出时间：' + date + '</w:t></w:r></w:p>';
    return cardCell(line);
  }

  function logoDrawingRun(side) {
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + side + '" cy="' + side + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="轻划 Logo"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="brand-icon.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdHeaderLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + side + '" cy="' + side + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }

  function brandedHeader() {
    const logoSide = 237744; // 0.26 inch in EMUs
    const slogan = "轻划一下，静默收录。全网好内容，一键导出神仙文档。";
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:tbl><w:tblPr><w:tblW w:w="9026" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="single" w:sz="4" w:space="6" w:color="E3E7EF"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="520"/><w:gridCol w:w="1400"/><w:gridCol w:w="7106"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="520" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="HeaderLogo"/></w:pPr>' + logoDrawingRun(logoSide) + '</w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="1400" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="HeaderBrand"/></w:pPr><w:r><w:t>轻划</w:t></w:r></w:p></w:tc><w:tc><w:tcPr><w:tcW w:w="7106" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="HeaderSlogan"/></w:pPr><w:r><w:t xml:space="preserve">' + esc(slogan) + '</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:hdr>';
  }

  function brandedFooter() {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:pStyle w:val="FooterMeta"/><w:tabs><w:tab w:val="right" w:pos="9026"/></w:tabs><w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="E3E7EF"/></w:pBdr></w:pPr><w:r><w:t>轻划 · 本地网页摘录</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>第 </w:t></w:r><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:color w:val="888888"/><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r></w:fldSimple><w:r><w:t> 页</w:t></w:r></w:p></w:ftr>';
  }

  function makeCard(clip, number, links) {
    const title = String(clip.title || "无标题网页").replace(/[\r\n]+/g, " ").trim();
    const url = String(clip.url || "");
    const time = ScrapbookFormat.localTimestamp(clip.capturedAt);
    let codeMode = false;
    const body = String(clip.text || "").replace(/\r\n/g, "\n").split("\n").map((line) => {
      const isFence = /^\s*```/.test(line);
      const isCode = codeMode || isFence || /^\s{2,}\S/.test(line) || line.includes("\t");
      const result = p(line, isCode ? "CardCode" : "CardBody");
      if (isFence) codeMode = !codeMode;
      return result;
    }).join("");
    let metadata;
    if (url) {
      const id = "rIdLink" + (links.length + 1);
      links.push('<Relationship Id="' + id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="' + esc(url) + '" TargetMode="External"/>');
      metadata = '<w:p><w:pPr><w:pStyle w:val="CardMetadata"/></w:pPr><w:r><w:t>📌 来源：</w:t></w:r><w:hyperlink r:id="' + id + '"><w:r><w:rPr><w:color w:val="6E8FA8"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">' + esc(title) + '</w:t></w:r></w:hyperlink><w:r><w:t xml:space="preserve">  ·  ⏱ ' + esc(time) + '  ·  ' + esc(url) + '</w:t></w:r></w:p>';
    } else metadata = p("📌 来源：" + title + "  ·  ⏱ " + time, "CardMetadata");
    const titleLine = p(String(number).padStart(2, "0") + "  ·  " + title, "CardTitle");
    return cardCell(titleLine + body + metadata) + p("", "CardGap");
  }

  function makeParts(project, clips, logoBytes) {
    const links = [
      '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>',
      '<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>',
      '<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
    ];
    const content = [p("摘录集", "DocumentTitle"), headerBadge(project, clips.length)];
    const orderedClips = [...clips].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
    orderedClips.forEach((clip, index) => content.push(makeCard(clip, index + 1, links)));

    const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Microsoft YaHei"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>' +
      '<w:style w:type="paragraph" w:styleId="HeaderLogo"><w:name w:val="Header Logo"/><w:pPr><w:jc w:val="center"/></w:pPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="HeaderBrand"><w:name w:val="Header Brand"/><w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="365FD2"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="HeaderSlogan"><w:name w:val="Header Slogan"/><w:pPr><w:jc w:val="right"/><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="16"/><w:color w:val="777E89"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="FooterMeta"><w:name w:val="Footer Meta"/><w:pPr><w:spacing w:before="100" w:after="0"/></w:pPr><w:rPr><w:sz w:val="18"/><w:color w:val="888888"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="DocumentTitle"><w:name w:val="Document Title"/><w:pPr><w:spacing w:after="140"/></w:pPr><w:rPr><w:b/><w:sz w:val="34"/><w:color w:val="222222"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="HeaderBadge"><w:name w:val="Header Badge"/><w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="20"/><w:color w:val="555555"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="CardTitle"><w:name w:val="Card Title"/><w:pPr><w:keepNext/><w:spacing w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="222222"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="CardBody"><w:name w:val="Card Body"/><w:pPr><w:spacing w:after="90"/></w:pPr><w:rPr><w:sz w:val="22"/><w:color w:val="444444"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="CardCode"><w:name w:val="Card Code"/><w:pPr><w:ind w:left="300"/><w:spacing w:after="40"/></w:pPr><w:rPr><w:rFonts w:ascii="Menlo" w:hAnsi="Menlo" w:eastAsia="Microsoft YaHei"/><w:sz w:val="20"/><w:color w:val="444444"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="CardMetadata"><w:name w:val="Card Metadata"/><w:pPr><w:spacing w:before="140" w:after="0"/></w:pPr><w:rPr><w:sz w:val="18"/><w:color w:val="888888"/></w:rPr></w:style>' +
      '<w:style w:type="paragraph" w:styleId="CardGap"><w:name w:val="Card Gap"/><w:pPr><w:spacing w:before="180" w:after="80"/></w:pPr><w:rPr><w:sz w:val="8"/></w:rPr></w:style></w:styles>';

    return [
      ["[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'],
      ["_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
      ["word/document.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>' + content.join("") + '<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720"/></w:sectPr></w:body></w:document>'],
      ["word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + links.join("") + '</Relationships>'],
      ["word/styles.xml", styles],
      ["word/header1.xml", brandedHeader()],
      ["word/_rels/header1.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdHeaderLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/brand-icon.png"/></Relationships>'],
      ["word/footer1.xml", brandedFooter()],
      ["word/media/brand-icon.png", logoBytes]
    ];
  }

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (const byte of bytes) {
      c ^= byte;
      for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xEDB88320 : 0);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function u16(view, offset, value) { view.setUint16(offset, value, true); }
  function u32(view, offset, value) { view.setUint32(offset, value, true); }
  function join(chunks) {
    const out = new Uint8Array(chunks.reduce((n, chunk) => n + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
    return out;
  }
  function zip(parts) {
    const locals = [], centrals = [];
    let offset = 0;
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    const date = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    for (const [path, content] of parts) {
      const name = encoder.encode(path), data = content instanceof Uint8Array ? content : encoder.encode(content), crc = crc32(data);
      const local = new Uint8Array(30 + name.length + data.length), lv = new DataView(local.buffer);
      u32(lv, 0, 0x04034B50); u16(lv, 4, 20); u16(lv, 6, 0x0800); u16(lv, 8, 0);
      u16(lv, 10, time); u16(lv, 12, date); u32(lv, 14, crc); u32(lv, 18, data.length); u32(lv, 22, data.length);
      u16(lv, 26, name.length); u16(lv, 28, 0); local.set(name, 30); local.set(data, 30 + name.length); locals.push(local);
      const central = new Uint8Array(46 + name.length), cv = new DataView(central.buffer);
      u32(cv, 0, 0x02014B50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0x0800); u16(cv, 10, 0);
      u16(cv, 12, time); u16(cv, 14, date); u32(cv, 16, crc); u32(cv, 20, data.length); u32(cv, 24, data.length);
      u16(cv, 28, name.length); u16(cv, 30, 0); u16(cv, 32, 0); u16(cv, 34, 0); u16(cv, 36, 0); u32(cv, 38, 0); u32(cv, 42, offset);
      central.set(name, 46); centrals.push(central); offset += local.length;
    }
    const directory = join(centrals), end = new Uint8Array(22), ev = new DataView(end.buffer);
    u32(ev, 0, 0x06054B50); u16(ev, 4, 0); u16(ev, 6, 0); u16(ev, 8, parts.length); u16(ev, 10, parts.length);
    u32(ev, 12, directory.length); u32(ev, 16, offset); u16(ev, 20, 0);
    return new Blob([join([...locals, directory, end])], { type: mime });
  }
  globalThis.ScrapbookDocx = {
    create: async (project, clips) => {
      const response = await fetch(QinghuaBrowser.runtime.getURL("icon128.png"));
      if (!response.ok) throw new Error("无法读取轻划 Logo");
      const logoBytes = new Uint8Array(await response.arrayBuffer());
      return zip(makeParts(project, clips, logoBytes));
    }
  };
})();
