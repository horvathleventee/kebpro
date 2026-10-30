import React from "react";
import { createRoot } from "react-dom/client";
import { Login } from "./AuthLogin";
import { TokenForm } from "./AuthTokenForm";
declare global { interface Window { KebproReactAuth: {mountLogin(element:HTMLElement):void; mountToken(element:HTMLElement, type:'reset'|'invitation'):void}; } }
window.KebproReactAuth = {
  mountLogin(element:HTMLElement) {
    const base = document.body.dataset.base || "/partner", admin = base === "/partner-admin", legal:Record<string,string> = {};
    if (!admin) for (const name of ["termsVersion", "termsHash", "privacyVersion", "privacyHash"]) legal[name] = (element.querySelector('[name="' + name + '"]') as HTMLInputElement).value;
    const badge = element.querySelector(".badge")!.textContent || "", footer = element.querySelector("p.small.muted:last-child")!.textContent || "";
    createRoot(element).render(<Login base={base} admin={admin} legal={legal} badge={badge} footer={footer} />);
  },
  mountToken(element:HTMLElement, type:'reset'|'invitation') {
    const token = location.hash.slice(1);
    history.replaceState(null, "", location.pathname);
    createRoot(element).render(<TokenForm type={type} base={document.body.dataset.base || "/partner-admin"} token={token} />);
  }
};
