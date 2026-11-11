import React, { useRef, useState } from 'react';
import { PhoneFields } from './PhoneFields';
function PasswordFields() {
  return (
    <>
      <label>
        Jelszó
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
        />
        <small>Legalább 8 karakter.</small>
      </label>
      <label>
        Jelszó megerősítése
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
        />
      </label>
    </>
  );
}
function Login({
  base,
  admin,
  legal,
  badge,
  footer,
  registrationSearchDemo,
  geoapifySearch,
}: {
  base: string;
  admin: boolean;
  legal: Record<string, string>;
  badge: string;
  footer: string;
  registrationSearchDemo: boolean;
  geoapifySearch: boolean;
}) {
  const [tab, setTab] = useState('login'),
    [message, setMessage] = useState(''),
    [sending, setSending] = useState(false),
    inFlight = useRef(false);
  const [phonePrefix, setPhonePrefix] = useState(''),
    [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [addressSelection, setAddressSelection] = useState('');
  const [addressResults, setAddressResults] = useState<{ label: string; token: string }[]>([]);
  const [addressMessage, setAddressMessage] = useState('');
  const [addressBusy, setAddressBusy] = useState(false);
  async function searchRegistrationAddress() {
    if (addressBusy) return;
    setAddressBusy(true);
    setAddressMessage('');
    setAddressResults([]);
    setAddressSelection('');
    try {
      const r = await fetch('/partner/api/registration-address-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: address }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'A keresés nem sikerült.');
      setAddressResults(data.results);
      if (!data.results.length) setAddressMessage('Nem találtunk címet.');
    } catch (error) {
      setAddressMessage(error instanceof Error ? error.message : 'A keresés nem sikerült.');
    } finally {
      setAddressBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget,
      values: Record<string, FormDataEntryValue | boolean> = Object.fromEntries(new FormData(form)),
      registering = form.id === 'register-form',
      forgetting = form.id === 'forgot-form';
    inFlight.current = true;
    setSending(true);
    setMessage('');
    try {
      if (registering) values.termsAccepted = values.termsAccepted === 'on';
      if (registering) {
        if ((registrationSearchDemo || geoapifySearch) && !addressSelection)
          throw new Error('Válaszd ki a szállítási címet a keresés találatai közül.');
        if (registrationSearchDemo || geoapifySearch) values.addressSelection = addressSelection;
        values.phone = '+36' + phonePrefix + phoneNumber;
        delete values.phonePrefix;
        delete values.phoneNumber;
      }
      if (registering && values.password !== values.confirmation)
        throw new Error('A k\xE9t jelsz\xF3 nem egyezik.');
      delete values.confirmation;
      const response = await fetch(
        base + '/api/' + (registering ? 'register' : forgetting ? 'forgot-password' : 'login'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nem siker\xFClt a m\u0171velet.');
      if (forgetting) {
        form.reset();
        setMessage(result.message);
      } else if (registering) {
        form.reset();
        setPhonePrefix('');
        setPhoneNumber('');
        setAddress('');
        setAddressSelection('');
        setAddressResults([]);
        setTab('login');
        setMessage(
          'A regisztr\xE1ci\xF3dat r\xF6gz\xEDtett\xFCk. A c\xE9ges j\xF3v\xE1hagy\xE1s ut\xE1n itt tudsz bejelentkezni. ' +
            (result.emailSent
              ? 'A megadott adatokr\xF3l visszaigazol\xF3 e-mailt k\xFCldt\xFCnk. Ellen\u0151rizd a lev\xE9lszem\xE9t mapp\xE1t is.'
              : 'A visszaigazol\xF3 e-mailt most nem siker\xFClt elk\xFCldeni, de a regisztr\xE1ci\xF3d megmaradt. Nem kell \xFAjra regisztr\xE1lnod.'),
        );
      } else location.href = result.next;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'A művelet nem sikerült.');
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }
  const select = (value: string) => {
    setTab(value);
    setMessage('');
  };
  return (
    <>
      <span className="badge amber">{badge}</span>
      <h2>
        {admin
          ? 'Céges bejelentkezés'
          : tab === 'register'
            ? 'Legyél a partnerünk'
            : tab === 'forgot'
              ? 'Jelszó visszaállítása'
              : 'Örülünk, hogy itt vagy!'}
      </h2>
      <p className="auth-subtitle">
        {admin
          ? 'Lépj be a céges kezelőfelületre.'
          : tab === 'register'
            ? 'Add meg az adataidat, és munkatársaink hamarosan ellenőrzik a jelentkezésedet.'
            : tab === 'forgot'
              ? 'Segítünk újra hozzáférni a fiókodhoz.'
              : 'Lépj be a partnerfelületre a rendeléseid kezeléséhez.'}
      </p>
      {!admin && (
        <div className="auth-tabs">
          {[
            ['login', 'Bejelentkez\xE9s'],
            ['register', 'Regisztr\xE1ci\xF3'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={'button ' + (tab === value ? 'primary' : 'secondary')}
              data-auth-tab={value}
              aria-pressed={tab === value}
              onClick={() => select(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <form id="login-form" className="stack" hidden={tab !== 'login'} onSubmit={submit}>
        <label>
          Felhasználónév
          <input name="username" autoComplete="username" required maxLength={100} />
        </label>
        <label>
          Jelszó
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        <button className="button primary full" disabled={sending}>
          Bejelentkezés →
        </button>
      </form>
      <button
        className="button text-button"
        hidden={tab !== 'login'}
        id="forgot-password"
        type="button"
        onClick={() => select('forgot')}
      >
        Elfelejtetted a jelszavad?
      </button>
      <form id="forgot-form" className="stack" hidden={tab !== 'forgot'} onSubmit={submit}>
        <p>A regisztrációkor megadott e-mail-címre küldünk egy 30 percig érvényes linket.</p>
        <label>
          Regisztrált e-mail-cím
          <input name="email" type="email" required maxLength={254} autoComplete="email" />
        </label>
        <button className="button primary" disabled={sending}>
          Visszaállító link kérése
        </button>
        <button
          type="button"
          className="button secondary"
          id="back-login"
          onClick={() => select('login')}
        >
          Vissza a belépéshez
        </button>
      </form>
      {!admin && (
        <>
          <form id="register-form" className="stack" hidden={tab !== 'register'} onSubmit={submit}>
            <div className="auth-notice">
              <span aria-hidden="true">✓</span>
              <p>
                <strong>Jó tudni</strong>
                <br />A hozzáférést munkatársaink hagyják jóvá, ezután tudsz rendelést leadni.
              </p>
            </div>
            <section className="auth-section">
              <div className="auth-section-heading">
                <span>01</span>
                <div>
                  <h3>Vállalkozás és kapcsolattartó</h3>
                  <p>Így tudjuk felvenni veled a kapcsolatot.</p>
                </div>
              </div>
              <div className="auth-fields-grid">
                <label>
                  Cég / üzlet neve
                  <input name="company" autoComplete="organization" required maxLength={250} />
                </label>
                <label>
                  Kapcsolattartó neve
                  <input name="contact" autoComplete="name" required maxLength={250} />
                </label>
                <label>
                  E-mail-cím
                  <input name="email" type="email" autoComplete="email" required maxLength={254} />
                </label>
                <PhoneFields
                  prefix={phonePrefix}
                  number={phoneNumber}
                  onPrefix={setPhonePrefix}
                  onNumber={setPhoneNumber}
                />
              </div>
            </section>
            <section className="auth-section">
              <div className="auth-section-heading">
                <span>02</span>
                <div>
                  <h3>Szállítási cím</h3>
                  <p>Hová szállíthatjuk a rendeléseidet?</p>
                </div>
              </div>
              <label>
                Szállítási cím
                <input
                  name="address"
                  autoComplete="street-address"
                  required
                  maxLength={250}
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setAddressSelection('');
                    setAddressResults([]);
                  }}
                />
                {geoapifySearch ? (
                  <small>
                    A keresett címet a Geoapify címkeresője kapja meg. A kiválasztott helyet
                    munkatársunk ellenőrzi.
                  </small>
                ) : registrationSearchDemo ? (
                  <small>
                    A próba csak nyilvános mintacímekkel működik: Budapest, Deák Ferenc tér;
                    Budapest, Kossuth Lajos tér; Budapest, Clark Ádám tér. A keresést a Nominatim
                    végzi.
                  </small>
                ) : (
                  <small>
                    Ha elérhető az automatikus címkeresés, a címet a térképes szállítási pont
                    megkereséséhez továbbítjuk a címkereső szolgáltatónak. A találatot munkatársunk
                    ellenőrzi.
                  </small>
                )}
              </label>
              {(registrationSearchDemo || geoapifySearch) && (
                <div className="auth-address-search">
                  <button
                    type="button"
                    className="auth-search-button"
                    disabled={addressBusy || !address.trim()}
                    onClick={() => void searchRegistrationAddress()}
                  >
                    {addressBusy ? 'Keresés…' : 'Cím keresése'}
                  </button>
                  {addressMessage && <p role="status">{addressMessage}</p>}
                  {addressResults.length > 0 && (
                    <ul>
                      {addressResults.map((r) => (
                        <li key={r.token}>
                          <button
                            type="button"
                            onClick={() => {
                              setAddress(r.label);
                              setAddressSelection(r.token);
                              setAddressResults([]);
                              setAddressMessage('A címet kiválasztottad.');
                            }}
                          >
                            {r.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <small>
                    {geoapifySearch && (
                      <>
                        Címkereső:{' '}
                        <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">
                          Geoapify
                        </a>{' '}
                        ·{' '}
                      </>
                    )}
                    Térképadatok: ©{' '}
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noreferrer"
                    >
                      OpenStreetMap közreműködők
                    </a>
                    .
                  </small>
                </div>
              )}
            </section>
            <section className="auth-section">
              <div className="auth-section-heading">
                <span>03</span>
                <div>
                  <h3>Belépési adatok</h3>
                  <p>Ezekkel tudsz majd bejelentkezni.</p>
                </div>
              </div>
              <div className="auth-fields-grid">
                <label>
                  Felhasználónév
                  <input
                    name="username"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={100}
                    pattern="[a-zA-Z0-9@._+\-]+"
                  />
                  <small>Ékezet nélküli név vagy e-mail-cím.</small>
                </label>
                <PasswordFields />
              </div>
            </section>
            <div className="auth-consent">
              <p>
                Olvasd el az{' '}
                <a
                  href={'/partner/legal/privacy/' + legal.privacyVersion}
                  target="_blank"
                  rel="noopener"
                >
                  adatkezelési tájékoztatót
                </a>
                .
              </p>
              <label className="check-line legal-check">
                <input type="checkbox" name="termsAccepted" required />
                <span>
                  Elolvastam és elfogadom a{' '}
                  <a
                    href={'/partner/legal/terms/' + legal.termsVersion}
                    target="_blank"
                    rel="noopener"
                  >
                    használati feltételeket
                  </a>
                  .
                </span>
              </label>
            </div>
            {Object.entries(legal).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button className="button primary full" disabled={sending}>
              Regisztráció elküldése →
            </button>
          </form>
        </>
      )}
      <p id="login-error" role="alert" className={message ? 'auth-feedback' : ''}>
        {message}
      </p>
      {!admin && (
        <div className="legal-links">
          <a href={'/partner/legal/terms/' + legal.termsVersion} target="_blank" rel="noopener">
            Használati feltételek
          </a>
          <a href={'/partner/legal/privacy/' + legal.privacyVersion} target="_blank" rel="noopener">
            Adatkezelési tájékoztató
          </a>
        </div>
      )}
      <p className="small muted">{footer}</p>
    </>
  );
}
export { Login };
