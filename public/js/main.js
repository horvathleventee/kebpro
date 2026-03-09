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
    const isMobile = window.matchMedia("(max-width: 980px)").matches;
    if (!isMobile) {
      return;
    }
    event.preventDefault();
    const parent = toggle.closest(".nav-dropdown");
    if (!parent) return;
    parent.classList.toggle("open");
  });
});

document.addEventListener("click", (event) => {
  const insideDropdown = event.target.closest(".nav-dropdown");
  if (insideDropdown) return;

  document.querySelectorAll(".nav-dropdown.open").forEach((item) => {
    item.classList.remove("open");
  });
});

const sections = document.querySelectorAll(".section-animate");

if (sections.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  sections.forEach((section) => observer.observe(section));
}
