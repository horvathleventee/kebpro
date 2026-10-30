import React, { useRef, useState } from "react";
function TokenForm({ type, base, token }: {type: "invitation" | "reset"; base: string; token: string}) {
  const invitation = type === "invitation", valid = /^[a-f0-9]{64}$/.test(token), [done, setDone] = useState(false), [sending, setSending] = useState(false), inFlight = useRef(false), [message, setMessage] = useState(valid ? "" : invitation ? "Hi\xE1nyz\xF3 vagy \xE9rv\xE9nytelen megh\xEDv\xF3. Nyisd meg az e-mailben kapott teljes linket, vagy k\xE9rj \xFAj megh\xEDv\xE1st egy c\xE9ges admint\xF3l." : "A link hi\xE1nyos vagy \xE9rv\xE9nytelen. A bel\xE9p\u0151oldalon k\xE9rj \xFAj vissza\xE1ll\xEDt\xF3 linket.");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget, values = Object.fromEntries(new FormData(form));
    inFlight.current = true;
    setSending(true);
    try {
      if (values.password !== values.confirmation) throw new Error("A k\xE9t jelsz\xF3 nem egyezik.");
      const response = await fetch(invitation ? "/partner-admin/api/accept-invitation" : base + "/api/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invitation ? { token, username: values.username, password: values.password } : { token, password: values.password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (invitation ? "Nem siker\xFClt l\xE9trehozni a fi\xF3kot." : "Nem siker\xFClt menteni."));
      form.reset();
      setDone(true);
      setMessage(invitation ? "A c\xE9ges fi\xF3kod elk\xE9sz\xFClt, az e-mail-c\xEDmed igazolva. Most m\xE1r bejelentkezhetsz a saj\xE1t adataiddal." : "A jelszavad elmentett\xFCk. Minden kor\xE1bbi bel\xE9p\xE9sedet lez\xE1rtuk; az \xFAj jelsz\xF3val jelentkezz be. Ha a regisztr\xE1ci\xF3d m\xE9g j\xF3v\xE1hagy\xE1sra v\xE1r, ezut\xE1n is sz\xFCks\xE9ges a c\xE9ges j\xF3v\xE1hagy\xE1s.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'A művelet nem sikerült.');
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }
  return <><h2>{invitation ? "Saj\xE1t c\xE9ges fi\xF3k l\xE9trehoz\xE1sa" : "Jelsz\xF3 megad\xE1sa"}</h2><form id={invitation ? "invitation-form" : "reset-form"} className="stack" hidden={!valid || done} onSubmit={submit}>{invitation && <label>Felhasználónév<input name="username" autoComplete="username" required minLength={3} maxLength={100} pattern="[a-zA-Z0-9@._+\-]+" /><small>Ékezet nélküli név, legalább 3 karakter.</small></label>}<label>Új jelszó<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label><label>Jelszó megerősítése<input name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></label><p className="small muted">{invitation ? "Legal\xE1bb 8 karakter. Az e-mail-c\xEDmedet a megh\xEDv\xF3 r\xF6gz\xEDti; a link elfogad\xE1s\xE1val igazolod azt." : "Legal\xE1bb 8 karakter. A kor\xE1bban haszn\xE1lt jelsz\xF3 is megadhat\xF3."}</p><button className="button primary" disabled={sending}>{invitation ? "Megh\xEDv\xF3 elfogad\xE1sa \xE9s fi\xF3k l\xE9trehoz\xE1sa" : "Jelsz\xF3 ment\xE9se"}</button></form><p role="alert" id={invitation ? "invitation-message" : "reset-message"}>{message}</p><a className="button secondary" href={invitation ? "/partner-admin/login" : base + "/login"}>{invitation ? "C\xE9ges bejelentkez\xE9s" : "Vissza a bejelentkez\xE9shez"}</a></>;
}
export {
  TokenForm
};
