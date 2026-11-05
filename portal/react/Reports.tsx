import React, { useState, useRef } from 'react';
import { Heading, PartnerComplaints } from './shared';
type Complaint = React.ComponentProps<typeof PartnerComplaints>['complaints'];
interface ReportProps {
  data: { complaints: Complaint };
  onSend(values: FormData): Promise<unknown>;
  onRefresh(): Promise<unknown>;
  onPhoto(id: string, label: string): void;
  onError(error: unknown): void;
}
export function Reports({ data, onSend, onRefresh, onPhoto, onError }: ReportProps) {
  const [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [success, setSuccess] = useState(false),
    [errorMessage, setErrorMessage] = useState(''),
    pending = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget,
      values = new FormData(form);
    pending.current = true;
    setBusy(true);
    setSuccess(false);
    setErrorMessage('');
    try {
      await onSend(values);
      form.reset();
      setDirty(false);
      setSuccess(true);
    } catch (error) {
      setErrorMessage(
        (error instanceof Error ? error.message : 'A küldés nem sikerült.') +
          ' Az üzenet és a kiválasztott kép megmaradt; ellenőrizd az adatokat, majd próbáld újra.',
      );
      onError(error);
      return;
    } finally {
      pending.current = false;
      setBusy(false);
    }
    try {
      await onRefresh();
    } catch (error) {
      onError(error);
    }
  }
  return (
    <>
      <Heading
        eyebrow="PARTNERI VISSZAJELZÉSEK"
        title="Bejelentéseim"
        description="Itt találod a korábbi bejelentéseidet és a Kebpro válaszait."
      />
      <section className="report-shortcut">
        <div>
          <h2>Probléma a rendeléseddel?</h2>
          <p>
            A Rendeléseim oldalon válaszd ki az érintett rendelést, majd nyomd meg a „Probléma
            bejelentése” lehetőséget.
          </p>
        </div>
        <a className="button secondary" href="#history">
          Rendeléseim megnyitása →
        </a>
      </section>
      <section className="card section-gap">
        <h2>Általános visszajelzés</h2>
        {success && (
          <p className="complaint-submit-success" role="status">
            ✓ A bejelentésedet sikeresen elküldtük.
          </p>
        )}
        <form
          data-general-report="true"
          data-dirty={dirty ? 'true' : undefined}
          onChange={() => setDirty(true)}
          onSubmit={submit}
        >
          <label>
            Üzenet
            <textarea name="message" maxLength={2000} required rows={4} disabled={busy} />
          </label>
          <label>
            Kép (nem kötelező)
            <input name="photo" type="file" accept="image/*" disabled={busy} />
          </label>
          {errorMessage && (
            <p className="notice warning" role="alert">
              {errorMessage}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? 'Küldés…' : 'Üzenet elküldése'}
          </button>
        </form>
      </section>
      <PartnerComplaints complaints={data.complaints} onView={onPhoto} />
    </>
  );
}
