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
          child.style.setProperty("--stagger-delay", `${index * 70}ms`);
          child.classList.add("is-visible");
        });
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
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
};

if (regionChips.length > 0 && logisticsPanelTitle && logisticsPanelText) {
  const updateRegionPanel = (chip) => {
    regionChips.forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    logisticsPanelTitle.textContent = chip.dataset.regionTitle || "";
    logisticsPanelText.textContent = chip.dataset.regionText || "";

    Object.values(mapNodes).forEach((node) => node?.classList.remove("emphasis", "is-active"));
    const activeNode = mapNodes[chip.dataset.regionKey];
    if (activeNode) {
      activeNode.classList.add("emphasis", "is-active");
    }
  };

  regionChips.forEach((chip) => {
    ["mouseenter", "focus", "click"].forEach((eventName) => {
      chip.addEventListener(eventName, () => updateRegionPanel(chip));
    });
  });
}
