function scrapeProduct() {
  const h3 = document.querySelector("h3");
  const upc = h3 ? h3.textContent.trim() : null;

  let description = null;
  if (h3) {
    let el = h3.nextElementSibling;
    while (el) {
      if (el.tagName === "SPAN") { description = el.textContent.trim(); break; }
      const inner = el.querySelector("span");
      if (inner) { description = inner.textContent.trim(); break; }
      el = el.nextElementSibling;
    }
  }

  const h4 = document.querySelector("h4");
  let price = null;
  if (h4) {
    const match = h4.textContent.match(/\$[\d,]+(?:\.\d+)?/);
    if (match) price = match[0];
  }

  return { upc, description, price };
}

const AVERY_TEMPLATES = {
  //           label w/h (in)        grid       sheet        sheet margins (in)   gap between labels (in)
  "5160": { name: '5160 — 2⅝" × 1"  (30/sheet)', w: 2.625, h: 1,     cols: 3, rows: 10, marginTop: 0.5,  marginLeft: 0.1875,  gapX: 0.125,  gapY: 0 },
  "5161": { name: '5161 — 4" × 1"   (20/sheet)', w: 4,     h: 1,     cols: 2, rows: 10, marginTop: 0.5,  marginLeft: 0.15625, gapX: 0.1875, gapY: 0 },
  "5163": { name: '5163 — 4" × 2"   (10/sheet)', w: 4,     h: 2,     cols: 2, rows: 5,  marginTop: 0.5,  marginLeft: 0.15625, gapX: 0.1875, gapY: 0 },
  "5164": { name: '5164 — 4" × 3⅓"  (6/sheet)', w: 4,     h: 3.333, cols: 2, rows: 3,  marginTop: 0.5,  marginLeft: 0.15625, gapX: 0.1875, gapY: 0 },
  "5168": { name: '5168 — 5" × 3½"  (4/sheet)', w: 5,     h: 3.5,   cols: 2, rows: 2,  marginTop: 0.5,  marginLeft: 0.125,   gapX: 0.25,   gapY: 0 },
  "5165": { name: '5165 — Full sheet (1/sheet)', w: 8.5,   h: 11,    cols: 1, rows: 1,  marginTop: 0,    marginLeft: 0,       gapX: 0,      gapY: 0 },
};

const LAST_TEMPLATE_KEY = "lou-ext-last-template";

function printLabel(upc, description, price, templateKey) {
  const tmpl = AVERY_TEMPLATES[templateKey] || AVERY_TEMPLATES["5163"];
  localStorage.setItem(LAST_TEMPLATE_KEY, templateKey);

  const count = tmpl.cols * tmpl.rows;

  // Scale typography to label height (baseline = 2in)
  const scale     = tmpl.h / 2;
  const descSize  = Math.max(6,  Math.round(10 * scale));
  const priceSize = Math.max(9,  Math.round(16 * scale));
  const upcSize   = Math.max(5,  Math.round(8  * scale));
  const barcodeH  = Math.max(30, Math.round(72 * scale));
  const barcodeW  = Math.max(1,  Math.round(10 * (tmpl.w / 4) * scale) / 10);
  const pad       = (Math.min(tmpl.w, tmpl.h) * 0.06).toFixed(3);

  // Build label cells — positioned absolutely on 8.5×11 sheet
  let labelsHTML = "";
  let n = 0;
  for (let row = 0; row < tmpl.rows && n < count; row++) {
    for (let col = 0; col < tmpl.cols && n < count; col++) {
      const x = (tmpl.marginLeft + col * (tmpl.w + tmpl.gapX)).toFixed(4);
      const y = (tmpl.marginTop  + row * (tmpl.h + tmpl.gapY)).toFixed(4);
      labelsHTML += `
        <div class="label" style="left:${x}in;top:${y}in;width:${tmpl.w}in;height:${tmpl.h}in;">
          <div class="desc">${description || ""}</div>
          ${price ? `<div class="price">${price}</div>` : ""}
          <svg class="barcode"></svg>
          <div class="upc">${upc}</div>
        </div>`;
      n++;
    }
  }

  const win = window.open("", "_blank", "width=900,height=700");
  win.document.write(`<!DOCTYPE html><html><head><title>Labels — Avery ${templateKey}</title>
  <style>
    @page { size: 8.5in 11in; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 8.5in; height: 11in; background: #fff; position: relative; overflow: hidden; }
    .label {
      position: absolute;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center; overflow: hidden;
      padding: ${pad}in;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .desc  { font-size: ${descSize}px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2; margin-bottom: ${Math.round(3*scale)}px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .price { display: inline-block; border: 1.5px solid #000; padding: 1px ${Math.round(8*scale)}px; font-size: ${priceSize}px; font-weight: 700; margin-bottom: ${Math.round(3*scale)}px; }
    .barcode { width: 200px; height: auto; display: block; }
    .upc   { font-family: monospace; font-size: ${upcSize}px; font-weight: 600; letter-spacing: 0.4px; margin-top: ${Math.round(2*scale)}px; }
  </style>
  <script src="${chrome.runtime.getURL("lib/JsBarcode.all.min.js")}"><\/script>
  </head><body>
  ${labelsHTML}
  <script>
    document.querySelectorAll(".barcode").forEach(svg => {
      JsBarcode(svg, ${JSON.stringify(upc)}, {
        format: "CODE128", width: ${barcodeW}, height: ${barcodeH},
        displayValue: false, margin: 0
      });
    });
    window.addEventListener("load", () => window.print());
  <\/script>
  </body></html>`);
  win.document.close();
}

function showBarcodeModal(upc, description, price) {
  document.getElementById("lou-ext-modal")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "lou-ext-modal";
  Object.assign(overlay.style, {
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    background: "rgba(0,0,0,0.5)", zIndex: 99999,
    display: "flex", alignItems: "center", justifyContent: "center",
  });

  const modal = document.createElement("div");
  Object.assign(modal.style, {
    background: "#fff", padding: "32px 48px 24px", borderRadius: "8px",
    minWidth: "480px", textAlign: "center", position: "relative",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  });

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    position: "absolute", top: "12px", right: "12px", background: "none",
    border: "none", fontSize: "18px", cursor: "pointer", color: "#666",
  });
  closeBtn.onclick = () => overlay.remove();

  const descEl = document.createElement("div");
  descEl.textContent = description || "";
  Object.assign(descEl.style, {
    fontSize: "16px", fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.5px", color: "#000", marginBottom: "12px",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    maxWidth: "380px",
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  const upcText = document.createElement("div");
  upcText.textContent = upc;
  Object.assign(upcText.style, {
    fontFamily: "monospace", fontSize: "14px", fontWeight: 600,
    letterSpacing: "1px", color: "#000", marginTop: "8px",
  });

  // Template selector
  const selectorWrap = document.createElement("div");
  Object.assign(selectorWrap.style, {
    marginTop: "16px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: "8px",
  });

  // Template row
  const templateRow = document.createElement("div");
  Object.assign(templateRow.style, { display: "flex", alignItems: "center", gap: "6px" });

  const selectorLabel = document.createElement("label");
  selectorLabel.textContent = "Avery template:";
  Object.assign(selectorLabel.style, { fontSize: "13px", color: "#555" });

  const saved = localStorage.getItem(LAST_TEMPLATE_KEY) || "5163";

  const select = document.createElement("select");
  Object.assign(select.style, {
    fontSize: "13px", padding: "4px 8px", border: "1px solid #ccc",
    borderRadius: "4px", cursor: "pointer",
  });
  Object.entries(AVERY_TEMPLATES).forEach(([key, tmpl]) => {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = tmpl.name;
    if (key === saved) opt.selected = true;
    select.appendChild(opt);
  });

  templateRow.appendChild(selectorLabel);
  templateRow.appendChild(select);

  selectorWrap.appendChild(templateRow);

  const printBtn = document.createElement("button");
  printBtn.textContent = "Print Label";
  Object.assign(printBtn.style, {
    marginTop: "10px", fontSize: "13px", padding: "7px 20px",
    background: "#4a90e2", color: "#fff", border: "none",
    borderRadius: "6px", cursor: "pointer",
  });
  printBtn.onclick = () => printLabel(upc, description, price, select.value);

  modal.appendChild(closeBtn);
  modal.appendChild(descEl);

  if (price) {
    const priceBox = document.createElement("div");
    priceBox.textContent = price;
    Object.assign(priceBox.style, {
      display: "inline-block", border: "2px solid #000",
      padding: "4px 24px", fontSize: "26px", fontWeight: 700,
      color: "#000", marginBottom: "16px",
    });
    modal.appendChild(priceBox);
    modal.appendChild(document.createElement("br"));
  }

  modal.appendChild(svg);
  modal.appendChild(upcText);
  modal.appendChild(selectorWrap);
  modal.appendChild(printBtn);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });

  try {
    JsBarcode(svg, upc, { format: "CODE128", width: 1, height: 60, displayValue: false, margin: 10 });
    Object.assign(svg.style, { display: "block", margin: "0 auto", width: "200px", height: "auto" });
  } catch (e) {
    const err = document.createElement("div");
    err.textContent = `Barcode error: ${e.message}`;
    err.style.color = "red";
    modal.insertBefore(err, upcText);
  }
}

function injectButton() {
  const skuProfile = document.querySelector(".skuProfile");
  if (!skuProfile) return;

  const ul = skuProfile.querySelector("ul");
  if (!ul || ul.querySelector(".lou-ext-barcode-btn")) return;

  const li = document.createElement("li");
  li.className = "lou-ext-barcode-btn";
  li.setAttribute("tabindex", "-1");
  li.innerHTML = `
    <div class="mx-dataview" data-focusindex="0">
      <div class="mx-dataview-content">
        <div class="ev-card card-color" style="cursor:pointer">
          <div class="ev-card-left-side" style="background-color:#5b9bd5">
            <span class="ev-card-icon glyphicon glyphicon-barcode" style="color:#2d5f8a"></span>
          </div>
          <div class="ev-card-right-side">
            <div class="ev-card-create-outter-container">
              <div class="ev-card-create-icon-container"></div>
            </div>
            <div class="ev-card-title-container">
              <p class="ev-card-title">Print Label</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  li.addEventListener("click", () => {
    const { upc, description, price } = scrapeProduct();
    if (!upc) { alert("No UPC found on this page."); return; }
    showBarcodeModal(upc, description, price);
  });

  ul.appendChild(li);
}

const observer = new MutationObserver(injectButton);
observer.observe(document.body, { childList: true, subtree: true });
injectButton();

// Popup fallback
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "scrapeProduct") sendResponse(scrapeProduct());
});
