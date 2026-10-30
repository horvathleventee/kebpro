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
    pending = useRef(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget,
      values = new FormData(form);
    pending.current = true;
    setBusy(true);
    try {
      await onSend(values);
      form.reset();
      setDirty(false);
      await onRefresh();
    } catch (error) {
      onError(error);
    } finally {
      pending.current = false;
      setBusy(false);
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
        <form
          data-general-report="true"
          data-dirty={dirty ? 'true' : undefined}
          onChange={() => setDirty(true)}
          onSubmit={submit}
        >
          <label>
            Üzenet
            <textarea name="message" maxLength={2000} required rows={4} />
          </label>
          <label>
            Kép (nem kötelező)
            <input name="photo" type="file" accept="image/*" />
          </label>
          <button className="button primary" disabled={busy}>
            Üzenet elküldése
          </button>
        </form>
      </section>
      <PartnerComplaints complaints={data.complaints} onView={onPhoto} />
    </>
  );
}
