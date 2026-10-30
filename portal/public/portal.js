"use strict";
if (window.KebproReactScreens?.startPortal) {
  window.KebproReactScreens.startPortal();
} else {
  const fail = () => { document.getElementById('content').textContent = 'Az alkalmazást most nem sikerült betölteni. Ellenőrizd a kapcsolatot, majd próbáld újra.'; };
  const loadScript = (src, next) => {
    const script = document.createElement('script');
    script.src = src;
    script.onerror = fail;
    if (next) script.onload = next;
    document.head.append(script);
  };
  loadScript('/partner/assets/portal-legacy.js', () => loadScript('/partner/assets/portal-legacy-controller.js'));
}
