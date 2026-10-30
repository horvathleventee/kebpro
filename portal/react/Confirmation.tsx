import React, { useLayoutEffect, useRef, useState } from 'react';
type ConfirmationModel =
  | { type: 'template'; templates: { id: string; name: string }[] }
  | { type: 'review'; date: string; lines: string[]; total: string; note: string }
  | { type: 'promotion'; product: string; unit: string }
  | { type: 'invite'; email: string }
  | { type: 'account'; name: string; disabled: boolean }
  | { type: 'text'; paragraphs: string[] };
function ConfirmationBody({ model }: { model: ConfirmationModel }) {
  if (model.type === 'template')
    return (
      <>
        <label>
          Lista neve
          <input id="template-name" maxLength={80} defaultValue="Szokásos rendelésem" />
        </label>
        <label>
          Mentés ide
          <select id="template-target">
            <option value="">Új lista</option>
            {model.templates.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name} felülírása
              </option>
            ))}
          </select>
        </label>
      </>
    );
  if (model.type === 'review')
    return (
      <>
        <p className="muted">Kiszállítás: {model.date}</p>
        <ul className="history-items">
          {model.lines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
        <p>
          <strong>{model.total}</strong>
        </p>
        {model.note && <p className="section-gap">{model.note}</p>}
      </>
    );
  if (model.type === 'promotion')
    return (
      <>
        <p>
          Biztosan megszünteted a(z) <strong>{model.product}</strong> {model.unit} egységre szóló
          akcióját?
        </p>
        <p>Az egyedi vagy alapár lesz újra érvényes. A korábbi rendelések ára nem változik.</p>
      </>
    );
  if (model.type === 'invite')
    return (
      <>
        <p>
          A meghívót erre a címre küldjük: <strong>{model.email}</strong>.
        </p>
        <p>A meghívott teljes céges hozzáférést kap. A link 24 óráig érvényes.</p>
      </>
    );
  if (model.type === 'account')
    return (
      <>
        <p>{model.name}</p>
        <p>
          {model.disabled
            ? 'A felhasználó kijelentkezik, és nem léphet be.'
            : 'A felhasználó ismét beléphet. Az értesítéseket újra engedélyeznie kell.'}
        </p>
      </>
    );
  return (
    <>
      {model.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </>
  );
}
export function Confirmation({
  title,
  model,
  action,
  dialog,
}: {
  title: string;
  model: ConfirmationModel;
  action: () => void | Promise<void>;
  dialog: HTMLDialogElement;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    inFlight = useRef(false);
  useLayoutEffect(() => {
    if (!dialog.open) dialog.showModal();
  }, [dialog]);
  async function submit() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      dialog.close();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'A művelet nem sikerült.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <h2 id="confirm-title">{title}</h2>
      <div id="confirm-content">
        <ConfirmationBody model={model} />
      </div>
      <div className="dialog-actions">
        <button
          className="button secondary"
          id="cancel-confirm"
          disabled={busy}
          onClick={() => dialog.close()}
        >
          Vissza
        </button>
        <button className="button primary" id="submit-confirm" disabled={busy} onClick={submit}>
          Véglegesítés
        </button>
      </div>
      <p id="confirm-error" role="alert">
        {error}
      </p>
    </>
  );
}
