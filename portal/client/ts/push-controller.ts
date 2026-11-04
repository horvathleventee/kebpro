import type { PortalRole } from './types';
interface PushContext {
  role: PortalRole;
  appState: { state: { data: { id: string; publicKey: string } } };
  screens: {
    openPushWelcome(props: {
      supported: boolean;
      denied: boolean;
      onEnable(): Promise<void>;
      onLater(): void;
    }): void;
  };
  api(
    path: string,
    body: PushSubscriptionJSON & { enableNews: boolean },
  ): Promise<{ mode: string }>;
  load(): Promise<unknown>;
  toast(message: string): void;
  window: Window & typeof globalThis;
  document: Pick<Document, 'querySelector'>;
  navigator: Navigator;
  localStorage: Pick<Storage, 'getItem' | 'setItem'>;
}
export function createPushController(ctx: PushContext) {
  const { role, appState, screens, api, load, toast, window, document, navigator, localStorage } =
    ctx;
  const Notification = window.Notification;
  const atob = window.atob.bind(window);
  async function registration() {
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    )
      throw new Error(
        'Ez a böngésző most nem támogatja a push értesítést. iPhone-on a főképernyőre telepített appból próbáld.',
      );
    const base = role === 'staff' ? '/partner-admin' : '/partner';
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        (async () => {
          await navigator.serviceWorker.register(base + '/sw.js', { scope: base + '/' });
          return navigator.serviceWorker.ready;
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Service worker activation timed out')), 10000);
        }),
      ]);
    } catch {
      throw new Error(
        'Az értesítési szolgáltatás nem indult el. Frissítsd az oldalt, és próbáld újra.',
      );
    } finally {
      clearTimeout(timer);
    }
  }
  function keyBytes(value: string) {
    const raw = atob(
      value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4),
    );
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }
  let pushOfferShown = false;
  function pushSetupKey() {
    return 'kebpro-push-intro-v1:' + appState.state.data.id;
  }
  function rememberPushOffer() {
    try {
      localStorage.setItem(pushSetupKey(), 'seen');
    } catch {}
  }
  async function enablePartnerPush() {
    if (
      !('Notification' in window) ||
      !('PushManager' in window) ||
      !('serviceWorker' in navigator)
    )
      throw new Error(
        'Ezen a böngészőn nem érhető el. iPhone-on előbb add a Főképernyőhöz, majd onnan nyisd meg az appot.',
      );
    // Called directly by a click handler, before any await, to preserve user activation.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted')
      throw new Error(
        'Az értesítéseket nem engedélyezted. A böngésző vagy a telefon beállításaiban később bekapcsolhatod.',
      );
    const reg = await registration();
    const subscription =
      (await reg.pushManager.getSubscription()) ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(appState.state.data.publicKey),
      }));
    const result = await api('subscription', { ...subscription.toJSON(), enableNews: true });
    rememberPushOffer();
    toast(
      result.mode === 'live'
        ? 'Értesítések és hírek bekapcsolva. A hírek a Beállításokban kikapcsolhatók.'
        : 'Értesítések és hírek beállítva. A távoli küldés jelenleg nem aktív.',
    );
    await load();
  }
  function offerPushSetup() {
    if (role !== 'partner' || pushOfferShown || document.querySelector('dialog[open]')) return;
    try {
      if (localStorage.getItem(pushSetupKey()) === 'seen') return;
    } catch {}
    pushOfferShown = true;
    const supported =
      'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
    const denied = supported && Notification.permission === 'denied';
    screens.openPushWelcome({
      supported,
      denied,
      onEnable: enablePartnerPush,
      onLater: rememberPushOffer,
    });
  }

  return { registration, keyBytes, enablePartnerPush, offerPushSetup };
}

export async function logoutWithPushCleanup(
  serviceWorker: ServiceWorkerContainer | undefined,
  base: string,
  logout: (body: { endpoint?: string }) => Promise<unknown>,
) {
  let subscription: PushSubscription | null | undefined;
  try {
    const reg = await serviceWorker?.getRegistration(base + '/');
    subscription = await reg?.pushManager?.getSubscription();
  } catch {
    // Logout must remain available if browser push APIs fail.
  }
  await logout({ endpoint: subscription?.endpoint });
  try {
    await subscription?.unsubscribe();
  } catch {
    // The server no longer sends to this endpoint; logout already succeeded.
  }
}
