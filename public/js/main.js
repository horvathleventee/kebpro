const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

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
const mapNodes = {
  west: document.querySelector(".map-node-west"),
  central: document.querySelector(".map-node-central"),
  north: document.querySelector(".map-node-north"),
  east: document.querySelector(".map-node-east"),
  south: document.querySelector(".map-node-south"),
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
  const updateRegionPanel = (chip) => {
    regionChips.forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    logisticsPanelTitle.textContent = chip.dataset.regionTitle || "";
    logisticsPanelText.textContent = chip.dataset.regionText || "";

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
    ["mouseenter", "focus", "click"].forEach((eventName) => {
      chip.addEventListener(eventName, () => updateRegionPanel(chip));
    });
  });
}

/* ── Count-up animation ── */
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

/* ── Scroll progress bar ── */
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

/* ── Postal code → delivery region checker ── */
const zipInput = document.getElementById("zipInput");
const zipResult = document.getElementById("zipResult");
const zipLabels = document.querySelector(".zip-labels");

if (zipInput && zipResult && zipLabels) {
  // Hungarian postal code → delivery region (2-digit prefix mapping)
  // 1xxx Budapest, 2xxx Pest → central
  // 3xxx Észak-Magyarország → north
  // 4xxx Hajdú-Bihar, Szabolcs, Jász → east
  // 50-52xx Szolnok area → east, 53-59xx Békés → south
  // 60-64xx Bács-Kiskun → south, 65-69xx Csongrád → south
  // 70-72xx Baranya → west, 73-74xx Tolna → west, 75-77xx Somogy → west
  // 80-81xx Székesfehérvár/Fejér → central, 82-84xx Veszprém → balaton
  // 85-87xx Zala → balaton, 88-89xx Veszprém/Balaton → balaton
  // 90-96xx Győr-Moson-Sopron → west, 97-99xx Vas → west
  const zipMap2 = {
    "10": "central", "11": "central", "12": "central", "13": "central", "14": "central",
    "15": "central", "16": "central", "17": "central", "18": "central", "19": "central",
    "20": "central", "21": "central", "22": "central", "23": "central", "24": "central",
    "25": "central", "26": "central", "27": "central", "28": "central", "29": "central",
    "30": "north", "31": "north", "32": "north", "33": "north", "34": "north",
    "35": "north", "36": "north", "37": "north", "38": "north", "39": "north",
    "40": "east", "41": "east", "42": "east", "43": "east", "44": "east",
    "45": "east", "46": "east", "47": "east", "48": "east", "49": "east",
    "50": "east", "51": "east", "52": "east",
    "53": "south", "54": "south", "55": "south", "56": "south", "57": "south", "58": "south", "59": "south",
    "60": "south", "61": "south", "62": "south", "63": "south", "64": "south",
    "65": "south", "66": "south", "67": "south", "68": "south", "69": "south",
    "70": "west", "71": "west", "72": "west", "73": "west", "74": "west",
    "75": "west", "76": "west", "77": "west",
    "80": "central", "81": "central",
    "82": "balaton", "83": "balaton", "84": "balaton",
    "85": "balaton", "86": "balaton", "87": "balaton", "88": "balaton", "89": "balaton",
    "90": "west", "91": "west", "92": "west", "93": "west", "94": "west",
    "95": "west", "96": "west", "97": "west", "98": "west", "99": "west",
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

/* ── Callback widget toggle + submit ── */
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

/* ── Product explorer tab switching ── */
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

/* ── FAQ show more / less toggle ── */
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
    });
  };

  rows.querySelectorAll(".order-product-row").forEach(bindRow);

  addButton?.addEventListener("click", () => {
    const firstRow = rows.querySelector(".order-product-row");
    if (!firstRow) return;
    const clone = firstRow.cloneNode(true);
    clone.querySelector("select").value = "";
    clone.querySelector("input").value = "";
    rows.appendChild(clone);
    bindRow(clone);
    clone.querySelector("select")?.focus();
    syncOrderSummary();
  });

  orderBuilder.closest("form")?.addEventListener("submit", syncOrderSummary);
  syncOrderSummary();
}
