const statusDiv  = document.getElementById("status");
const labelCard  = document.getElementById("label-card");
const descEl     = document.getElementById("description");
const priceBox   = document.getElementById("price-box");
const barcodeEl  = document.getElementById("barcode");
const upcTextEl  = document.getElementById("upc-text");
const errorDiv   = document.getElementById("error");
const actionsDiv = document.getElementById("actions");

function showError(msg) {
  statusDiv.textContent = "";
  errorDiv.textContent = msg;
}

function renderLabel({ upc, description, price }) {
  if (!upc) {
    showError("No UPC found — make sure the product dialog is open.");
    return;
  }

  try {
    JsBarcode(barcodeEl, upc, {
      format: "CODE128",
      width: 2.5,
      height: 80,
      displayValue: false,
      margin: 0,
    });
  } catch (e) {
    showError(`Could not generate barcode for "${upc}": ${e.message}`);
    return;
  }

  descEl.textContent  = description || "";
  priceBox.textContent = price || "";
  upcTextEl.textContent = upc;

  // Hide price box if no price found
  document.getElementById("price-wrap").style.display = price ? "block" : "none";

  statusDiv.style.display = "none";
  labelCard.style.display  = "block";
  actionsDiv.style.display = "block";
}

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.url?.includes("lou.evosus.com")) {
    statusDiv.textContent = "Not on a Lou page.";
    return;
  }

  chrome.tabs.sendMessage(tab.id, { action: "scrapeProduct" }, (result) => {
    if (chrome.runtime.lastError) {
      showError("Could not connect to page. Try reloading.");
      return;
    }
    renderLabel(result || {});
  });
});

document.getElementById("print-btn").addEventListener("click", () => window.print());
