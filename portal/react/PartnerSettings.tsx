import React, { useEffect, useRef, useState } from 'react';
import { Heading, SessionSettings } from './shared';
import { PhoneFields, splitMobilePhone } from './PhoneFields';
import { PartnerDeliveryPoint } from './PartnerDeliveryPoint';
interface PartnerData {
  preferences: { reminders: boolean; news: boolean };
  loginSession: React.ComponentProps<typeof SessionSettings>['session'];
  name: string;
  address: string;
  phone?: string;
  deliveryOptions: { route: string }[];
}
interface SettingsProps {
  data: PartnerData;
  onPhone(phone: string): Promise<unknown>;
  onPreferences(values: { reminders: boolean; news: boolean }): Promise<unknown>;
  onEnable(): Promise<unknown>;
  onDisable(): Promise<unknown>;
  onStatus(): Promise<'on' | 'off' | 'denied' | 'unsupported'>;
  onExtend(): void;
  onError(error: unknown): void;
}
export function PartnerSettings({
  data,
  onPreferences,
  onPhone,
  onEnable,
  onDisable,
  onStatus,
  onExtend,
  onError,
}: SettingsProps) {
  const [reminders, setReminders] = useState(data.preferences.reminders),
    [news, setNews] = useState(data.preferences.news),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    pending = useRef(false);
  const [phonePrefix, setPhonePrefix] = useState(() => splitMobilePhone(data.phone || '').prefix);
  const [phoneNumber, setPhoneNumber] = useState(() => splitMobilePhone(data.phone || '').number);
  const [phoneMessage, setPhoneMessage] = useState('');
  const [preferencesMessage, setPreferencesMessage] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<
    'checking' | 'on' | 'off' | 'denied' | 'unsupported' | 'error'
  >('checking');
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;
  async function refreshStatus() {
    setDeviceStatus('checking');
    try {
      setDeviceStatus(await statusRef.current());
    } catch {
      setDeviceStatus('error');
    }
  }
  useEffect(() => {
    void refreshStatus();
    const onVisible = () => {
      if (!document.hidden) void refreshStatus();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  useEffect(() => {
    if (!dirty && !busy) {
      setReminders(data.preferences.reminders);
      setNews(data.preferences.news);
    }
  }, [data.preferences, dirty, busy]);
  async function run(action: () => Promise<unknown>) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(true);
    try {
      await action();
      return true;
    } catch (error) {
      onError(error);
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreferencesMessage('');
    if (await run(() => onPreferences({ reminders, news }))) {
      setDirty(false);
      setPreferencesMessage('Értesítési beállítások elmentve.');
    }
  }
  return (
    <div className="partner-settings">
      <Heading
        eyebrow="SAJÁT BEÁLLÍTÁSOK"
        title="Beállítások"
        description="Kezeld a partneradataidat, az értesítéseket és a bejelentkezésedet egy helyen."
      />
      <PartnerDeliveryPoint />
      <div className="partner-settings-grid">
        <section className="card settings-notifications">
          <span className="partner-section-label">ÉRTESÍTÉSEK</span>
          <h2>Miről értesítsünk?</h2>
          <p className="muted settings-intro">Válaszd ki, milyen üzeneteket szeretnél kapni.</p>
          <form id="preferences" data-dirty={dirty ? 'true' : undefined} onSubmit={save}>
            <label className="check-line">
              <input
                type="checkbox"
                name="reminders"
                checked={reminders}
                onChange={(event) => {
                  setReminders(event.target.checked);
                  setDirty(true);
                  setPreferencesMessage('');
                }}
              />
              <span>
                Rendelési emlékeztetők
                <small>A rendelési nap előtt és a rendelési napon, ha még nem válaszoltál.</small>
              </span>
            </label>
            <label className="check-line">
              <input
                type="checkbox"
                name="news"
                checked={news}
                onChange={(event) => {
                  setNews(event.target.checked);
                  setDirty(true);
                  setPreferencesMessage('');
                }}
              />
              <span>
                Hírek és akciók<small>Értesítés az új ajánlatokról és céges közleményekről.</small>
              </span>
            </label>
            <button className="button primary" disabled={busy}>
              Beállítások mentése
            </button>
            {preferencesMessage && (
              <p className="settings-success" role="status">
                {preferencesMessage}
              </p>
            )}
          </form>
          <div className="settings-device">
            <h3>Értesítés ezen az eszközön</h3>
            <p
              role="status"
              className={'section-gap ' + (deviceStatus === 'on' ? 'settings-success' : '')}
            >
              {deviceStatus === 'checking' && 'Az eszköz állapotának ellenőrzése…'}
              {deviceStatus === 'on' && 'Az értesítések ezen az eszközön be vannak kapcsolva.'}
              {deviceStatus === 'off' && 'Az értesítések ezen az eszközön nincsenek bekapcsolva.'}
              {deviceStatus === 'denied' &&
                'A telefon vagy a böngésző tiltja az értesítéseket. iPhone-on a Beállítások → Értesítések alatt engedélyezd az alkalmazást.'}
              {deviceStatus === 'unsupported' &&
                'Ezen a böngészőn nem érhető el a push. iPhone-on add az alkalmazást a Főképernyőhöz, majd onnan nyisd meg.'}
              {deviceStatus === 'error' && 'Az eszköz állapotát nem sikerült ellenőrizni.'}
            </p>
            {deviceStatus === 'off' && reminders && (
              <p className="small muted">
                Az emlékeztetők be vannak kapcsolva, de ez az eszköz még nem fogad értesítéseket.
              </p>
            )}
            <div className="settings-actions">
              {(deviceStatus === 'error' ||
                deviceStatus === 'denied' ||
                deviceStatus === 'unsupported') && (
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void refreshStatus()}
                >
                  Állapot újraellenőrzése
                </button>
              )}
              {deviceStatus === 'off' && (
                <p className="small muted">
                  A bekapcsolás a híreket és akciókat is engedélyezi; ez később módosítható.
                </p>
              )}
              {(deviceStatus === 'on' || deviceStatus === 'off') && (
                <button
                  className="button secondary"
                  data-action={deviceStatus === 'on' ? 'disable-push' : 'enable-push'}
                  disabled={busy}
                  onClick={async () => {
                    await run(deviceStatus === 'on' ? onDisable : onEnable);
                    await refreshStatus();
                  }}
                >
                  {deviceStatus === 'on'
                    ? 'Értesítések kikapcsolása ezen az eszközön'
                    : 'Értesítések bekapcsolása'}
                </button>
              )}
            </div>
          </div>
        </section>
        <div className="stack">
          <section className="card">
            <span className="partner-section-label">FIÓK</span>
            <h2>Partneradataid</h2>
            <p className="section-gap">
              <strong>{data.name}</strong>
              <br />
              <span className="muted">{data.address}</span>
            </p>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setPhoneMessage('');
                if (await run(() => onPhone('+36' + phonePrefix + phoneNumber)))
                  setPhoneMessage('Telefonszám elmentve.');
              }}
            >
              <PhoneFields
                prefix={phonePrefix}
                number={phoneNumber}
                onPrefix={(value) => {
                  setPhonePrefix(value);
                  setPhoneMessage('');
                }}
                onNumber={(value) => {
                  setPhoneNumber(value);
                  setPhoneMessage('');
                }}
              />
              {data.phone && !splitMobilePhone(data.phone).prefix && (
                <p className="small muted">
                  Korábbi mentett szám: {data.phone}. Frissítéskor adj meg magyar mobilszámot.
                </p>
              )}
              <button className="button secondary" disabled={busy}>
                Telefonszám mentése
              </button>
              {phoneMessage && <p role="status">{phoneMessage}</p>}
            </form>
            <p className="small muted section-gap">
              Kiszállítási túra: {[...new Set(data.deliveryOptions.map((d) => d.route))].join(', ')}
            </p>
          </section>
          <section className="card">
            <span className="partner-section-label">ALKALMAZÁS</span>
            <h2>Kebpro a kezdőképernyőn</h2>
            <p className="muted section-gap">
              Ha a böngésző felajánlja, válaszd a Telepítés lehetőséget. iPhone-on: Megosztás →
              Főképernyőhöz adás. A telefonos pushhoz ezután nyisd meg az ikonnal az alkalmazást, és
              engedélyezd az értesítéseket.
            </p>
          </section>
          <SessionSettings session={data.loginSession} onExtend={onExtend} />
        </div>
      </div>
    </div>
  );
}
