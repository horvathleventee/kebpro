const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

const deleteForms = document.querySelectorAll("form[data-confirm-delete]");
if (deleteForms.length > 0) {
  const modal = document.createElement("div");
  modal.className = "confirm-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="confirm-modal-backdrop" data-confirm-cancel></div>
    <div class="confirm-modal-card" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
      <div class="confirm-modal-body">
        <div class="confirm-modal-icon" aria-hidden="true">!</div>
        <div>
          <h2 class="confirm-modal-title" id="confirmModalTitle">Törlés megerősítése</h2>
          <p class="confirm-modal-text">Biztosan törölni szeretnéd ezt a bejegyzést? Ez a művelet nem vonható vissza.</p>
        </div>
      </div>
      <div class="confirm-modal-actions">
        <button type="button" class="btn btn-secondary" data-confirm-cancel>Mégse</button>
        <button type="button" class="btn confirm-modal-danger" data-confirm-accept>Törlés</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let pendingDeleteForm = null;
  const acceptButton = modal.querySelector("[data-confirm-accept]");
  const cancelButtons = modal.querySelectorAll("[data-confirm-cancel]");

  const closeConfirmModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    pendingDeleteForm = null;
  };

  const openConfirmModal = (form) => {
    pendingDeleteForm = form;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    acceptButton?.focus();
  };

  deleteForms.forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      openConfirmModal(form);
    });
  });

  acceptButton?.addEventListener("click", () => {
    if (!pendingDeleteForm) return;
    HTMLFormElement.prototype.submit.call(pendingDeleteForm);
  });

  cancelButtons.forEach((button) => button.addEventListener("click", closeConfirmModal));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeConfirmModal();
    }
  });
}

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    mainNav.classList.toggle("open");
  });
}

const dropdownToggles = document.querySelectorAll(".dropdown-toggle");

dropdownToggles.forEach((toggle) => {
  toggle.addEventListener("click", (event) => {
    const isMobile = window.matchMedia("(max-width: 1100px)").matches;
    if (!isMobile) return;
    event.preventDefault();
    const parent = toggle.closest(".nav-dropdown");
    if (!parent) return;
    parent.classList.toggle("open");
  });
});

document.addEventListener("click", (event) => {
  const insideDropdown = event.target.closest(".nav-dropdown");
  const insideMenuButton = event.target.closest("#menuToggle");
  const insideNav = event.target.closest("#mainNav");

  if (!insideDropdown) {
    document.querySelectorAll(".nav-dropdown.open").forEach((item) => {
      item.classList.remove("open");
    });
  }

  if (!insideMenuButton && !insideNav && mainNav && window.matchMedia("(max-width: 1100px)").matches) {
    mainNav.classList.remove("open");
  }
});

const sections = document.querySelectorAll(".section-animate");

if (sections.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        entry.target.querySelectorAll("[data-stagger]").forEach((child, index) => {
          child.style.setProperty("--stagger-delay", `${index * 45}ms`);
          child.classList.add("is-visible");
        });
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0, rootMargin: "0px 0px -40px 0px" }
  );

  sections.forEach((section) => observer.observe(section));
}

const regionChips = document.querySelectorAll(".region-chip");
const logisticsPanelTitle = document.getElementById("logisticsPanelTitle");
const logisticsPanelText = document.getElementById("logisticsPanelText");
const logisticsPanelSchedule = document.getElementById("logisticsPanelSchedule");
const mapNodes = {
  northHungary: document.querySelector(".map-node-north-hungary"),
  northAlfold: document.querySelector(".map-node-north-alfold"),
  southAlfold: document.querySelector(".map-node-south-alfold"),
  centralDunantul: document.querySelector(".map-node-central-dunantul"),
  westDunantul: document.querySelector(".map-node-west-dunantul"),
  southDunantul: document.querySelector(".map-node-south-dunantul"),
  centralHungary: document.querySelector(".map-node-central-hungary"),
  balaton: document.querySelector(".map-node-balaton"),
};

const regionOverlays = {
  west: document.querySelector(".region-overlay-west"),
  central: document.querySelector(".region-overlay-central"),
  north: document.querySelector(".region-overlay-north"),
  east: document.querySelector(".region-overlay-east"),
  south: document.querySelector(".region-overlay-south"),
};

if (regionChips.length > 0 && logisticsPanelTitle && logisticsPanelText) {
  const findRegionChip = (regionKey) => document.querySelector(`.region-chip[data-region-key="${regionKey}"]`);

  const updateRegionPanel = (chip) => {
    if (!chip) return;
    regionChips.forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    logisticsPanelTitle.textContent = chip.dataset.regionTitle || "";
    logisticsPanelText.textContent = chip.dataset.regionText || "";
    if (logisticsPanelSchedule) {
      logisticsPanelSchedule.textContent = chip.dataset.regionSchedule || "";
      logisticsPanelSchedule.style.display = chip.dataset.regionSchedule ? "inline-flex" : "none";
    }

    if (logisticsPanelTitle.parentElement) {
      logisticsPanelTitle.parentElement.classList.remove("panel-top-left", "panel-top-right", "panel-bottom-left", "panel-bottom-right");
      logisticsPanelTitle.parentElement.classList.add(chip.dataset.panelPosition || "panel-bottom-right");
    }

    Object.values(mapNodes).forEach((node) => node?.classList.remove("emphasis", "is-active"));
    Object.values(regionOverlays).forEach((overlay) => overlay?.classList.remove("emphasis", "is-active"));

    const activeNode = mapNodes[chip.dataset.regionKey];
    const activeOverlay = regionOverlays[chip.dataset.regionKey];

    if (activeNode) {
      activeNode.classList.add("emphasis", "is-active");
    }

    if (activeOverlay) {
      activeOverlay.classList.add("emphasis", "is-active");
    }
  };

  regionChips.forEach((chip) => {
    ["mouseenter", "pointerenter", "focus", "click"].forEach((eventName) => {
      chip.addEventListener(eventName, () => updateRegionPanel(chip));
    });
  });

  Object.values(mapNodes).forEach((node) => {
    if (!node) return;
    ["mouseenter", "pointerenter", "focus", "click"].forEach((eventName) => {
      node.addEventListener(eventName, () => updateRegionPanel(findRegionChip(node.dataset.regionKey)));
    });
  });

  updateRegionPanel(document.querySelector(".region-chip.active") || regionChips[0]);
}

/* Count-up animation */
const countUpElements = document.querySelectorAll(".count-up[data-target]");
if (countUpElements.length > 0) {
  const countObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const raw = el.dataset.target;
        const match = raw.match(/([\d]+)/);
        if (!match) return;
        const target = parseInt(match[1], 10);
        const suffix = raw.replace(match[1], "");
        const duration = 1600;
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        countObserver.unobserve(el);
      });
    },
    { threshold: 0.3 }
  );
  countUpElements.forEach((el) => countObserver.observe(el));
}

/* Scroll progress bar */
const scrollBar = document.querySelector(".scroll-progress");
if (scrollBar) {
  const updateProgress = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    scrollBar.style.width = docHeight > 0 ? (scrollTop / docHeight) * 100 + "%" : "0%";
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();
}

/* Postal code to delivery region checker */
const zipInput = document.getElementById("zipInput");
const zipResult = document.getElementById("zipResult");
const zipLabels = document.querySelector(".zip-labels");

if (zipInput && zipResult && zipLabels) {
  // Hungarian postal code -> delivery region (2-digit prefix mapping)
  const zipMap2 = {
    "10": "centralHungary", "11": "centralHungary", "12": "centralHungary", "13": "centralHungary", "14": "centralHungary",
    "15": "centralHungary", "16": "centralHungary", "17": "centralHungary", "18": "centralHungary", "19": "centralHungary",
    "20": "centralHungary", "21": "centralHungary", "22": "centralHungary", "23": "centralHungary",
    "24": "centralDunantul", "25": "centralDunantul", "26": "centralHungary", "27": "centralHungary", "28": "centralDunantul", "29": "centralHungary",
    "30": "northHungary", "31": "northHungary", "32": "northHungary", "33": "northHungary", "34": "northHungary",
    "35": "northHungary", "36": "northHungary", "37": "northHungary", "38": "northHungary", "39": "northHungary",
    "40": "northAlfold", "41": "northAlfold", "42": "northAlfold", "43": "northAlfold", "44": "northAlfold",
    "45": "northAlfold", "46": "northAlfold", "47": "northAlfold", "48": "northAlfold", "49": "northAlfold",
    "50": "northAlfold", "51": "northAlfold", "52": "northAlfold",
    "53": "southAlfold", "54": "southAlfold", "55": "southAlfold", "56": "southAlfold", "57": "southAlfold", "58": "southAlfold", "59": "southAlfold",
    "60": "southAlfold", "61": "southAlfold", "62": "southAlfold", "63": "southAlfold", "64": "southAlfold",
    "65": "southAlfold", "66": "southAlfold", "67": "southAlfold", "68": "southAlfold", "69": "southAlfold",
    "70": "southDunantul", "71": "southDunantul", "72": "southDunantul", "73": "southDunantul", "74": "southDunantul",
    "75": "southDunantul", "76": "southDunantul", "77": "southDunantul",
    "80": "centralDunantul", "81": "centralDunantul",
    "82": "balaton", "83": "balaton", "84": "balaton",
    "85": "balaton", "86": "balaton", "87": "balaton", "88": "balaton", "89": "balaton",
    "90": "westDunantul", "91": "westDunantul", "92": "westDunantul", "93": "westDunantul", "94": "westDunantul",
    "95": "westDunantul", "96": "westDunantul", "97": "westDunantul", "98": "westDunantul", "99": "westDunantul",
  };
  const resultText = zipLabels.dataset.zipResult;
  const notFoundText = zipLabels.dataset.zipNotFound;

  zipInput.addEventListener("input", () => {
    const val = zipInput.value.replace(/\D/g, "");
    zipInput.value = val;
    if (val.length < 2) {
      zipResult.textContent = "";
      zipResult.className = "zip-result";
      return;
    }
    if (val === "6000") {
      const chip = document.querySelector('.region-chip[data-region-key="centralHungary"]');
      if (chip) {
        chip.click();
        zipResult.textContent = resultText + " " + chip.dataset.regionTitle;
        zipResult.className = "zip-result";
        return;
      }
    }
    const prefix2 = val.substring(0, 2);
    const regionKey = zipMap2[prefix2];
    if (regionKey) {
      const chip = document.querySelector(`.region-chip[data-region-key="${regionKey}"]`);
      if (chip) {
        chip.click();
        zipResult.textContent = resultText + " " + chip.dataset.regionTitle;
        zipResult.className = "zip-result";
      }
    } else {
      zipResult.textContent = notFoundText;
      zipResult.className = "zip-result zip-error";
    }
  });
}

/* Callback widget toggle + submit */
const callbackToggle = document.getElementById("callbackToggle");
const callbackWidget = document.getElementById("callbackWidget");
const callbackForm = document.getElementById("callbackForm");

if (callbackToggle && callbackWidget) {
  callbackToggle.addEventListener("click", () => {
    callbackWidget.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#callbackWidget")) {
      callbackWidget.classList.remove("open");
    }
  });
}

if (callbackForm) {
  callbackForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new URLSearchParams(new FormData(callbackForm));
    try {
      const res = await fetch("/visszahivas", { method: "POST", body: formData, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (res.ok) {
        callbackWidget.classList.add("sent");
        setTimeout(() => {
          callbackWidget.classList.remove("open", "sent");
          callbackForm.reset();
        }, 3000);
      }
    } catch (_) { /* silent */ }
  });
}

/* Product explorer tab switching */
const explorerTabs = document.querySelectorAll(".explorer-tab");
if (explorerTabs.length > 0) {
  explorerTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const idx = tab.dataset.explorerIdx;
      document.querySelectorAll(".explorer-tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".explorer-panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const panel = document.querySelector(`.explorer-panel[data-explorer-panel="${idx}"]`);
      if (panel) panel.classList.add("active");
    });
  });
}

/* FAQ show more / less toggle */
const faqToggle = document.getElementById("faqToggle");
const faqList = document.getElementById("faqList");
if (faqToggle && faqList) {
  faqToggle.addEventListener("click", () => {
    const expanded = faqList.classList.toggle("faq-expanded");
    faqToggle.textContent = expanded ? faqToggle.dataset.hide : faqToggle.dataset.show;
  });
}

document.querySelectorAll("[data-success-toast]").forEach((toast) => {
  window.setTimeout(() => {
    toast.classList.add("is-hiding");
    window.setTimeout(() => toast.remove(), 400);
  }, 6500);
});

const orderBuilder = document.querySelector("[data-order-products]");
if (orderBuilder) {
  const rows = orderBuilder.querySelector("[data-order-product-rows]");
  const addButton = orderBuilder.querySelector("[data-add-order-product]");
  const maxProductRows = 20;

  const updateAddButtonState = () => {
    if (!addButton) return;
    addButton.disabled = rows.querySelectorAll(".order-product-row").length >= maxProductRows;
  };

  const syncOrderSummary = () => {
    const productInput = document.getElementById("product");
    const quantityInput = document.getElementById("quantity");
    if (!productInput || !quantityInput) return;

    const selected = [...rows.querySelectorAll(".order-product-row")]
      .map((row) => {
        const product = row.querySelector("select")?.value.trim() || "";
        const quantity = row.querySelector("input")?.value.trim() || "";
        return { product, quantity };
      })
      .filter((item) => item.product);

    productInput.value = selected
      .map((item) => `${item.product}${item.quantity ? ` - ${item.quantity}` : ""}`)
      .join("\n");
    quantityInput.value = selected.map((item) => item.quantity).filter(Boolean).join("; ");
  };

  const bindRow = (row) => {
    row.querySelectorAll("select, input").forEach((field) => {
      field.addEventListener("change", syncOrderSummary);
      field.addEventListener("input", syncOrderSummary);
    });

    row.querySelector(".order-remove-product")?.addEventListener("click", () => {
      if (rows.querySelectorAll(".order-product-row").length === 1) {
        row.querySelector("select").value = "";
        row.querySelector("input").value = "";
      } else {
        row.remove();
      }
      syncOrderSummary();
      updateAddButtonState();
    });
  };

  rows.querySelectorAll(".order-product-row").forEach(bindRow);

  addButton?.addEventListener("click", () => {
    if (rows.querySelectorAll(".order-product-row").length >= maxProductRows) return;
    const firstRow = rows.querySelector(".order-product-row");
    if (!firstRow) return;
    const clone = firstRow.cloneNode(true);
    clone.querySelector("select").value = "";
    clone.querySelector("input").value = "";
    rows.appendChild(clone);
    bindRow(clone);
    clone.querySelector("select")?.focus();
    syncOrderSummary();
    updateAddButtonState();
  });

  orderBuilder.closest("form")?.addEventListener("submit", syncOrderSummary);
  syncOrderSummary();
  updateAddButtonState();
}

