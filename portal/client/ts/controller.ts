import { createApplicationState } from './application-state';
import { createDraftController } from './draft-controller';
import { createPortalLoader } from './loader';
import { createPortalApi } from './api';
import { createOrderActions } from './order-actions';
import { createStaffSettingsActions } from './staff-settings-actions';
import * as orderPricing from './order-pricing';
import * as navigation from './navigation';
import { compressComplaintPhoto } from './photo';
import { createPushController } from './push-controller';
import { createSessionController } from './session-controller';
import { createAuditFormatter } from './audit';
import type { PortalScreens } from '../../react/screens';
import type { DraftStore } from './draft-controller';
declare const KebproDrafts: { create(storage: Storage, id: string): DraftStore };
import type { PortalRole, OrderUnit } from './types';
import type React from 'react';
import type { Dashboard } from '../../react/Dashboard';
import type { Order } from '../../react/Order';
import type { History } from '../../react/History';
import type { Calls } from '../../react/Calls';
import type { Packing } from '../../react/Packing';
import type { Home } from '../../react/Home';
import type { Reports } from '../../react/Reports';
import type { Applications } from '../../react/Applications';
import type { StaffNews } from '../../react/StaffNews';
import type { PartnerSettings } from '../../react/PartnerSettings';
import type { StaffSettings } from '../../react/StaffSettings';
import type { Products } from '../../react/Products';
import type { Notifications } from '../../react/Notifications';
import type { StaffComplaints } from '../../react/StaffComplaints';
type DataOf<T> = T extends (props: infer P) => unknown
  ? P extends { data: infer D }
    ? D
    : never
  : never;
type PortalData = DataOf<typeof Dashboard> &
  DataOf<typeof Order> &
  DataOf<typeof History> &
  DataOf<typeof Calls> &
  DataOf<typeof Packing> &
  DataOf<typeof Home> &
  DataOf<typeof Reports> &
  DataOf<typeof Applications> &
  DataOf<typeof StaffNews> &
  DataOf<typeof PartnerSettings> &
  DataOf<typeof StaffSettings> &
  DataOf<typeof Products> &
  DataOf<typeof Notifications> &
  DataOf<typeof StaffComplaints> & {
    id: string;
    publicKey: string;
    accounts: NonNullable<DataOf<typeof StaffSettings>['accounts']>;
    loginSession: { expiresAt: string; canExtend?: boolean };
    favoriteProductIds: string[];
    currentResponses: ResponseItem[];
    auditLog: {
      id: string;
      at: string;
      actorName: string;
      action: string;
      changes: {
        collection: string;
        id: string;
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
      }[];
    }[];
  };
type CartItem = { productId: string; name: string; quantity: number; unit: OrderUnit };
type ResponseItem = {
  id: string;
  date: string;
  status: string;
  kind: string;
  items: CartItem[];
  note?: string;
  revision?: number;
  canEdit?: boolean;
  requestId?: string;
  changeIds?: string[];
  delivery?: { date: string; route: string; cutoffDate: string; cutoff: string; open: boolean };
};
type StoreState = {
  data: PortalData;
  cart: CartItem[];
  note: string;
  requestId: string;
  orderDate: string;
  editing: { id: string; revision: number } | null;
};
export function startPortalController(screens: PortalScreens) {
  'use strict';
  const role: PortalRole = document.body.dataset.role === 'staff' ? 'staff' : 'partner';
  const base = role === 'staff' ? '/partner-admin' : '/partner';
  const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')!.content;
  const content = document.getElementById('content')!;
  const appState = createApplicationState<StoreState>({
    data: undefined as unknown as PortalData,
    cart: [],
    note: '',
    requestId: crypto.randomUUID(),
    orderDate: '',
    editing: null,
  });
  let newsRequestId = crypto.randomUUID();
  let automaticLoadPending = false;
  let ordersPage = 1,
    historyPage = 1;
  let searchTimer: ReturnType<typeof setTimeout>;
  let productSearch = '',
    partnerSearch = '',
    pricePartner = '';
  let complaintRequests: Record<string, string> = {};
  let orderView = 'new',
    archiveSort = 'createdAt',
    archiveDate = '',
    orderSearch = '',
    loadSequence = 0,
    mutations = 0,
    routeSettingsOpen = false,
    partnerDaysOpen = false;

  let draftError = '';
  let reactDraft;
  function getReactDraft() {
    return (reactDraft ||= createDraftController({
      role,
      getStorage: () => localStorage,
      createStore: KebproDrafts.create,
      getState: () => ({
        data: appState.state.data,
        cart: appState.state.cart,
        note: appState.state.note,
        editing: appState.state.editing,
        requestId: appState.state.requestId,
      }),
      setState: (changes) => {
        if ('cart' in changes) appState.state.cart = changes.cart;
        if ('note' in changes) appState.state.note = changes.note;
        if ('orderDate' in changes) appState.state.orderDate = changes.orderDate;
        if ('editing' in changes) appState.state.editing = changes.editing;
        if ('requestId' in changes) appState.state.requestId = changes.requestId;
      },
      setError: (value) => {
        draftError = value;
      },
      chosenDelivery,
      toast,
      showStatus: showDraftStatus,
    }));
  }
  function restoreDraft() {
    getReactDraft().restore();
  }
  function saveDraft() {
    getReactDraft().save();
  }
  function showDraftStatus() {
    const host = document.getElementById('draft-status');
    if (!host) return;
    const exists = Boolean(
      appState.state.cart.length || appState.state.note || appState.state.editing,
    );
    host.hidden = !exists && !draftError;
    const delivery = chosenDelivery();
    screens.renderDraft(host, {
      error: draftError,
      exists,
      date: dateLabel(delivery.date),
      count: appState.state.cart.length,
      open: delivery.open,
      onDiscard: discardDraft,
    });
  }

  let selectedDate = '',
    selectedRoute = '',
    callMode = 'today';
  let deferredInstall: (Event & { prompt(): Promise<unknown> }) | null = null,
    toastTimer: ReturnType<typeof setTimeout>;
  function openComplaintPhoto(id: string, label: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw Error('A kép nem található.');
    screens.openPhoto({ id, label, base });
  }

  async function openComplaintExport(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw Error('A bejelentés nem található.');
    const response = await fetch(
      '/partner-admin/api/complaints/' + encodeURIComponent(id) + '/export',
    );
    if (!response.ok) throw Error('A bejelentést nem sikerült előkészíteni. Próbáld újra.');
    const blob = await response.blob(),
      file = new File([blob], 'kebpro-bejelentes.html', { type: 'text/html' }),
      url = URL.createObjectURL(blob);
    screens.openExport({
      file,
      url,
      onClose: () => setTimeout(() => URL.revokeObjectURL(url), 60000),
    });
  }
  const dateLabel = (value: string) =>
    new Intl.DateTimeFormat('hu-HU', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      timeZone: 'Europe/Budapest',
    }).format(new Date(value + 'T12:00:00Z'));
  const quantity = (n: number) =>
    new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 2 }).format(n);
  const statusLabel = {
    received: 'Beérkezett',
    archived: 'Feldolgozva',
    skip: 'Nem kér szállítást',
  };
  function toast(message: string) {
    const element = document.getElementById('toast')!;
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (element.hidden = true), 6500);
  }
  let reactApi: ReturnType<typeof createPortalApi>;
  async function api<T = unknown>(path: string, body?: unknown, method = 'POST'): Promise<T> {
    reactApi ||= createPortalApi({
      base,
      csrf,
      fetchImpl: window.fetch.bind(window),
      isOnline: () => navigator.onLine,
      saveDraft,
      onMutationStart: () => {
        mutations++;
        loadSequence++;
      },
      onMutationEnd: () => {
        mutations--;
      },
      onUnauthorized: () => {
        location.href = base + '/login';
      },
    });
    return reactApi<T>(path, body, method);
  }

  function discardDraft() {
    confirm('Piszkozat törlése', () => {
      appState.state.cart = [];
      appState.state.note = '';
      appState.state.editing = null;
      appState.state.requestId = crypto.randomUUID();
      render();
    });
  }
  function currentTab() {
    return navigation.currentTab(role, location);
  }
  function syncStatus(message: string) {
    document.getElementById('sync-status')!.textContent = message;
  }
  let reactLoader;
  async function load(automatic = false) {
    reactLoader ||= createPortalLoader({
      content,
      document,
      window,
      navigator,
      api,
      restoreDraft,
      render,
      syncStatus,
      offerSessionRenewal,
      offerPushSetup,
      toast,
      statusLabel,
      getState: () => ({
        role,
        data: appState.state.data,
        automaticLoadPending,
        mutations,
        loadSequence,
        ordersPage,
        historyPage,
        orderView,
        archiveSort,
        archiveDate,
        orderSearch,
        selectedDate,
        selectedRoute,
      }),
      setState: (changes) => {
        if (changes.data) appState.state.data = changes.data as PortalData;
        if (changes.automaticLoadPending !== undefined)
          automaticLoadPending = changes.automaticLoadPending;
        if (changes.loadSequence !== undefined) loadSequence = changes.loadSequence;
        if (changes.ordersPage !== undefined) ordersPage = changes.ordersPage;
        if (changes.historyPage !== undefined) historyPage = changes.historyPage;
        if (changes.selectedDate !== undefined) selectedDate = changes.selectedDate;
      },
    });
    return reactLoader(automatic);
  }

  function chosenDelivery() {
    if (!appState.state.orderDate) appState.state.orderDate = appState.state.data.nextDelivery.date;
    const editing = appState.state.editing;
    const edited =
      editing &&
      [...(appState.state.data.currentResponses || []), ...appState.state.data.history].find(
        (r) => r.id === editing.id,
      );
    if (edited?.delivery && edited.date === appState.state.orderDate) return edited.delivery;
    return (
      appState.state.data.deliveryOptions.find((d) => d.date === appState.state.orderDate) || {
        date: appState.state.orderDate,
        cutoffDate: appState.state.orderDate,
        cutoff: '—',
        open: false,
        route: 'Lejárt időpont',
      }
    );
  }
  function currentResponse() {
    return (appState.state.data.currentResponses || appState.state.data.history).find((r) =>
      appState.state.editing
        ? r.id === appState.state.editing.id
        : r.date === chosenDelivery().date,
    );
  }
  function startEdit(response: ResponseItem) {
    appState.state.editing = { id: response.id, revision: response.revision || 1 };
    appState.state.orderDate = response.date;
    appState.state.cart = response.items.map((i) => ({ ...i }));
    appState.state.note = response.note || '';
    appState.state.requestId = crypto.randomUUID();
    location.hash = 'order';
    render();
  }

  function money(value: number | null | undefined) {
    return value === null || value === undefined
      ? 'Ár egyeztetendő'
      : new Intl.NumberFormat('hu-HU').format(value) + ' Ft';
  }
  function currentPrice(item: CartItem) {
    return orderPricing.getUnitPrice(appState.state.data.products, item);
  }
  function currentLine(item: CartItem) {
    return orderPricing.getLinePrice(appState.state.data.products, item);
  }
  function cartSummary() {
    return orderPricing.summarizeCart(appState.state.data.products, appState.state.cart);
  }

  const expandedAccountLists = new Set<string>();
  function operationTime(value: string) {
    return new Date(value).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' });
  }
  const { registration, keyBytes, enablePartnerPush, offerPushSetup } = createPushController({
    role,
    appState,
    screens,
    api,
    load,
    toast,
    window,
    document,
    navigator,
    localStorage,
  });
  const { offerSessionRenewal, openSessionRenewal } = createSessionController({
    role,
    appState,
    screens,
    api,
    render,
    toast,
    operationTime,
    document,
    localStorage,
  });
  const openAuditGroups = new Set(['0']);
  const { reactAuditEvents } = createAuditFormatter(() => appState.state.data);
  function editHistoryOrder(id: string) {
    const response = [
      ...appState.state.data.history,
      ...(appState.state.data.currentResponses || []),
    ].find((r) => r.id === id);
    if (!response?.canEdit) throw new Error('A határidő lejárt.');
    if (appState.state.cart.length) confirm('Rendelés módosítása', () => startEdit(response));
    else startEdit(response);
  }
  function repeatHistoryOrder(id: string) {
    if (currentResponse() || !chosenDelivery().open)
      throw new Error('A következő kiszállításra most nem adhatsz le új rendelést.');
    const old = appState.state.data.history.find((r) => r.id === id);
    appState.state.cart = old!.items
      .filter((i) => appState.state.data.products.some((p) => p.id === i.productId))
      .map((i) => ({ ...i }));
    appState.state.requestId = crypto.randomUUID();
    location.hash = 'order';
    render();
    toast('A korábbi tételeket betöltöttük. Ellenőrizd a mennyiségeket beküldés előtt.');
  }
  function skipDelivery() {
    if (
      currentTab() === 'home' &&
      (appState.state.cart.length || appState.state.note || appState.state.editing)
    ) {
      location.hash = 'order';
      toast('Előbb fejezd be vagy töröld a meglévő piszkozatot.');
      return;
    }
    if (currentTab() === 'home') {
      appState.state.orderDate = appState.state.data.nextDelivery.date;
      appState.state.editing = null;
    }
    confirm('Most nem kérsz szállítást?', async () => {
      await api('responses', {
        kind: 'skip',
        date: chosenDelivery().date,
        requestId: appState.state.requestId,
        responseId: appState.state.editing?.id,
        revision: appState.state.editing?.revision,
      });
      appState.state.editing = null;
      appState.state.cart = [];
      appState.state.note = '';
      appState.state.requestId = crypto.randomUUID();
      saveDraft();
      await load();
      location.hash = 'history';
      toast('Válaszod rögzítettük.');
    });
  }
  const orderActions = createOrderActions({
    getState: () => ({
      data: appState.state.data,
      cart: appState.state.cart,
      note: appState.state.note,
      orderDate: appState.state.orderDate,
      editing: appState.state.editing,
      requestId: appState.state.requestId,
    }),
    setState: (changes) => {
      if (changes.cart !== undefined) appState.state.cart = changes.cart;
      if (changes.note !== undefined) appState.state.note = changes.note;
      if (changes.orderDate !== undefined) appState.state.orderDate = changes.orderDate;
      if (changes.editing !== undefined) appState.state.editing = changes.editing;
      if (changes.requestId !== undefined) appState.state.requestId = changes.requestId;
      if (changes.historyPage !== undefined) historyPage = changes.historyPage;
    },
    render,
    saveDraft,
    confirm,
    openProductPicker,
    editHistoryOrder,
    toast,
    api,
    load,
    currentResponse,
    chosenDelivery,
    currentPrice,
    skipDelivery,
    navigate: (tab) => {
      location.hash = tab;
    },
  });
  const staffSettingsActions = createStaffSettingsActions({
    getData: () => appState.state.data,
    expanded: expandedAccountLists,
    api,
    load,
    toast,
    confirm,
    openSessionRenewal,
  });
  function render() {
    const tab = currentTab();
    const complaints = (appState.state.data.allPartners || []).reduce(
      (count, p) => count + (p.complaints || []).filter((c) => c.status === 'open').length,
      0,
    );
    screens.renderNavigation({
      role,
      active: tab,
      complaints,
      applications: appState.state.data.todo?.pending || 0,
    });
    if (!document.getElementById('react-app-root')) {
      const root = document.createElement('div');
      root.id = 'react-app-root';
      content.replaceChildren(root);
    }
    if (role === 'staff' && tab === 'dashboard') {
      screens.renderScreen('Dashboard', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        orderView,
        archiveSort,
        archiveDate,
        orderSearch,
        onCalls: () => {
          callMode = 'today';
          location.hash = 'calls';
          render();
        },
        onView: (view) => {
          orderView = view;
          orderSearch = '';
          ordersPage = 1;
          load().catch((error) =>
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
          );
        },
        onSort: (value) => {
          archiveSort = value;
          ordersPage = 1;
          load().catch((error) =>
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
          );
        },
        onDate: (value) => {
          archiveDate = value;
          ordersPage = 1;
          load().catch((error) =>
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
          );
        },
        onSearch: (value) => {
          orderSearch = value;
          ordersPage = 1;
          loadSequence++;
          clearTimeout(searchTimer);
          searchTimer = setTimeout(
            () =>
              load().catch((error) =>
                toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
              ),
            350,
          );
        },
        onPage: (page) => {
          ordersPage = page;
          load()
            .then(() => window.scrollTo(0, 0))
            .catch((error) =>
              toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
            );
        },
        onArchive: async (order, archived) => {
          try {
            await api('archive', { id: order.id, archived, revision: order.revision || 1 });
            await load();
            toast(
              archived
                ? 'Rendelés archiválva. Az Archívumból visszaállítható.'
                : 'Rendelés visszaállítva az újak közé.',
            );
          } catch (error) {
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.');
          }
        },
      });
    } else if (role === 'staff' && tab === 'calls') {
      screens.renderScreen('Calls', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        mode: callMode,
        date: selectedDate,
        route: selectedRoute,
        onMode: (mode) => {
          callMode = mode;
          queueMicrotask(() => render());
        },
        onFilter: (date, route) => {
          selectedDate = date;
          selectedRoute = route;
          load().catch((error) =>
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
          );
        },
      });
    } else if (role === 'staff' && tab === 'settings') {
      screens.renderScreen('StaffSettings', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        expanded: [...expandedAccountLists],
        routeOpen: routeSettingsOpen,
        daysOpen: partnerDaysOpen,
        onRouteOpen: (open) => {
          routeSettingsOpen = open;
        },
        onDaysOpen: (open) => {
          partnerDaysOpen = open;
        },
        actions: staffSettingsActions,
      });
    } else if (role === 'staff' && tab === 'products') {
      screens.renderScreen('Products', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        productSearch,
        partnerSearch,
        pricePartner,
        onProductSearch: (value) => {
          productSearch = value;
        },
        onPartnerSearch: (value) => {
          partnerSearch = value;
        },
        onPartnerSelect: (value) => {
          if (content.querySelector('form[data-price-product][data-dirty="true"]')) {
            toast('Előbb mentsd az elkezdett ármódosítást.');
            return;
          }
          pricePartner = value;
          render();
        },
        onError: (error) =>
          toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
        onPrice: async (values) => {
          await api('prices', values);
          await load();
          toast('Ár elmentve.');
        },
        onPromotion: async (values) => {
          await api('promotions', values);
          await load();
          toast('Általános akció elmentve.');
        },
        onAvailability: async (id, active) => {
          await api('products', { id, active });
          await load();
          toast('Termék elérhetősége mentve.');
        },
        onRemove: (product, unit) =>
          confirm(
            'Akció levétele',
            async () => {
              await api('promotions', { productId: product.id, unit, kind: 'none', value: null });
              await load();
              toast('Akció megszüntetve.');
            },
            { product: product.name, unit },
          ),
      });
    } else if (role === 'staff' && tab === 'notifications') {
      screens.renderScreen('Notifications', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        audit: reactAuditEvents(),
        openGroups: [...openAuditGroups],
        onGroup: (group, open) => {
          if (open) openAuditGroups.add(group);
          else openAuditGroups.delete(group);
        },
        onReminder: async () => {
          try {
            const result = await api<{ created: number }>('reminders', {});
            await load();
            toast(result.created + ' új emlékeztető került a naplóba.');
          } catch (error) {
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.');
          }
        },
        onEnable: async () => {
          try {
            if (
              !('Notification' in window) ||
              !('PushManager' in window) ||
              !('serviceWorker' in navigator)
            )
              throw Error(
                'iPhone-on előbb add a főképernyőhöz és onnan nyisd meg az adminfelületet.',
              );
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') throw Error('Az értesítéseket nem engedélyezted.');
            const reg = await registration(),
              subscription =
                (await reg.pushManager.getSubscription()) ||
                (await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: keyBytes(appState.state.data.publicKey),
                }));
            const result = await api<{ mode: string }>('subscription', subscription.toJSON());
            toast(
              result.mode === 'live'
                ? 'Rendelési értesítések bekapcsolva.'
                : 'Az eszköz feliratkozott; a távoli küldés még nem aktív.',
            );
            await load();
          } catch (error) {
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.');
          }
        },
        onDisable: async () => {
          try {
            const reg = await registration(),
              subscription = await reg.pushManager.getSubscription();
            if (subscription) {
              await api('subscription', { endpoint: subscription.endpoint }, 'DELETE');
              await subscription.unsubscribe();
            }
            toast('Az eszköz leiratkozott.');
            await load();
          } catch (error) {
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.');
          }
        },
      });
    } else if (role === 'staff' && tab === 'complaints') {
      screens.renderScreen('StaffComplaints', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        onPhoto: openComplaintPhoto,
        onExport: openComplaintExport,
        onError: (error) =>
          toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
        onReply: async (values) => {
          await api('complaints', values);
          await load();
          toast('Válasz és állapot mentve.');
        },
      });
    } else if (role === 'staff' && tab === 'applications') {
      screens.renderScreen('Applications', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        onError: (error) =>
          toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
        onApprove: async (id, routeIds) => {
          const result = await api<{ emailSent: boolean }>('applications', {
            id,
            status: 'approved',
            routeIds,
          });
          await load();
          toast(
            result.emailSent
              ? 'Partner jóváhagyva; az értesítést átadtuk a levelezőszervernek.'
              : 'Partner jóváhagyva, de az értesítő e-mail küldése sikertelen. Értesítsd a partnert más módon.',
          );
        },
        onReject: (id) =>
          confirm('Regisztráció elutasítása', async () => {
            await api('applications', { id, status: 'rejected' });
            await load();
            toast('Kérelem elutasítva.');
          }),
      });
    } else if (role === 'staff' && tab === 'packing') {
      screens.renderScreen('Packing', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        date: selectedDate,
        route: selectedRoute,
        onFilter: (date, route) => {
          selectedDate = date;
          selectedRoute = route;
          load().catch((error) =>
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
          );
        },
      });
    } else if (role === 'staff' && tab === 'news') {
      screens.renderScreen('StaffNews', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        onError: (error) =>
          toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
        onPublish: async (values) => {
          await api('news', { ...values, requestId: newsRequestId });
          newsRequestId = crypto.randomUUID();
          toast('A hír megjelent.');
          try {
            await load();
          } catch (error) {
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.');
          }
        },
      });
    } else if (role === 'partner' && tab === 'settings') {
      screens.renderScreen('PartnerSettings', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        onError: (error) =>
          toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
        onExtend: openSessionRenewal,
        onPreferences: async (values) => {
          await api('preferences', values);
          toast('Beállítások elmentve.');
          await load();
        },
        onEnable: enablePartnerPush,
        onDisable: async () => {
          const reg = await registration(),
            subscription = await reg.pushManager.getSubscription();
          if (subscription) {
            await api('subscription', { endpoint: subscription.endpoint }, 'DELETE');
            await subscription.unsubscribe();
          }
          toast('Ez az eszköz leiratkozott.');
          await load();
        },
        onTest: async () => {
          const reg = await registration();
          if (Notification.permission !== 'granted')
            throw Error('Előbb engedélyezd az értesítéseket.');
          await reg.showNotification('Kebpro · Helyi próba', {
            body: 'Így jelenhet meg a rendelési emlékeztetőd. Ez csak ezen az eszközön indított teszt.',
            icon: '/partner/assets/partner-v2-192.png',
            data: { url: '/partner/' },
          });
          toast('Helyi próbaértesítés megjelenítve.');
        },
      });
    } else if (role === 'partner' && tab === 'order') {
      screens.renderScreen('Order', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        next: chosenDelivery(),
        response: currentResponse() || null,
        cart: appState.state.cart,
        note: appState.state.note,
        editing: appState.state.editing,
        actions: orderActions,
        cartRevision: appState.state.requestId,
      });
    } else if (role === 'partner' && tab === 'history') {
      screens.renderScreen('History', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        onError: (error) =>
          toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
        onPhoto: openComplaintPhoto,
        onEdit: (id) => {
          try {
            editHistoryOrder(id);
          } catch (error) {
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.');
          }
        },
        onRepeat: (id) => {
          try {
            repeatHistoryOrder(id);
          } catch (error) {
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.');
          }
        },
        onPage: async (page) => {
          try {
            historyPage = page;
            await load();
            window.scrollTo(0, 0);
          } catch (error) {
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.');
          }
        },
        onSend: async (id, values) => {
          complaintRequests[id] ||= crypto.randomUUID();
          const photo = await compressComplaintPhoto(values.get('photo') as File | null),
            labelPhoto = await compressComplaintPhoto(values.get('labelPhoto') as File | null);
          await api('complaints', {
            orderId: id,
            kind: 'complaint',
            message: values.get('message'),
            requestId: complaintRequests[id],
            photo,
            labelPhoto,
          });
          delete complaintRequests[id];
        },
        onRefresh: async () => {
          toast('Bejelentés elküldve.');
          try {
            await load();
          } catch (error) {
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.');
          }
        },
      });
    } else if (role === 'partner' && tab === 'reports') {
      screens.renderScreen('Reports', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        onPhoto: openComplaintPhoto,
        onError: (error) =>
          toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
        onSend: async (values) => {
          complaintRequests.general ||= crypto.randomUUID();
          const photo = await compressComplaintPhoto(values.get('photo') as File | null);
          await api('complaints', {
            kind: 'general',
            message: values.get('message'),
            requestId: complaintRequests.general,
            photo,
            labelPhoto: null,
          });
          delete complaintRequests.general;
        },
        onRefresh: async () => {
          toast('Bejelentés elküldve.');
          try {
            await load();
          } catch (error) {
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.');
          }
        },
      });
    } else if (role === 'partner' && tab === 'home') {
      screens.renderScreen('Home', document.getElementById('react-app-root')!, {
        data: appState.state.data,
        onSkip: skipDelivery,
        onRepeat: (id) => {
          try {
            repeatHistoryOrder(id);
          } catch (error) {
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.');
          }
        },
      });
    } else if (role === 'partner' && tab === 'news') {
      screens.renderScreen('News', document.getElementById('react-app-root')!, {
        news: appState.state.data.news,
        onRefresh: () =>
          load().catch((error) =>
            toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
          ),
      });
    }
    if (role === 'partner') {
      if (!document.getElementById('draft-status')) {
        const host = document.createElement('section');
        host.id = 'draft-status';
        host.className = 'notice warning';
        host.setAttribute('aria-live', 'polite');
        host.hidden = true;
        content.prepend(host);
      }
      saveDraft();
    }
  }
  function confirmationModel(
    title: string,
    context: { email?: string; name?: string; product?: string; unit?: string } = {},
  ): React.ComponentProps<typeof import('../../react/Confirmation').Confirmation>['model'] {
    const staticText: Record<string, string> = {
      'Rendelés módosítása': 'A jelenlegi kosár helyére a kiválasztott rendelés kerül.',
      'Másik kiszállítás kiválasztása': 'A kosár nem mentett változtatásai elvesznek. Folytatod?',
      'Kosár cseréje': 'A kosár helyére a mentett lista kerül.',
      'Mentett lista törlése': 'A korábbi rendeléseid megmaradnak.',
      'Meghívó visszavonása': 'A kiküldött linkkel ezután már nem hozható létre céges fiók.',
      'Regisztráció elutasítása': 'A partner nem kap hozzáférést. Biztosan elutasítod a kérelmet?',
      'Piszkozat törlése':
        'A nem beküldött kosár és megjegyzés törlődik ezen az eszközön. A már leadott rendelések megmaradnak.',
    };
    if (title in staticText) return { type: 'text', paragraphs: [staticText[title]] };
    if (title === 'Most nem kérsz szállítást?')
      return {
        type: 'text',
        paragraphs: [
          dateLabel(chosenDelivery().date) +
            ' napjára rögzítjük, hogy nem kérsz árut. Így a munkatársaknak nem kell telefonon rákérdezniük.',
        ],
      };
    if (title === 'Szokásos rendelési lista mentése')
      return {
        type: 'template',
        templates: appState.state.data.templates.map(({ id, name }) => ({ id, name })),
      };
    if (title === 'Ellenőrizd a rendelésed')
      return {
        type: 'review',
        date: dateLabel(chosenDelivery().date),
        lines: appState.state.cart.map(
          (i) =>
            i.name +
            ' · ' +
            quantity(i.quantity) +
            ' ' +
            i.unit +
            ' · ' +
            money(currentPrice(i)) +
            ' / ' +
            i.unit +
            ' · ' +
            money(currentLine(i)),
        ),
        total: cartSummary(),
        note: appState.state.note,
      };
    if (title === 'Akció levétele')
      return { type: 'promotion', product: context.product || '', unit: context.unit || '' };
    if (title === 'Céges munkatárs meghívása')
      return {
        type: 'invite',
        email:
          context.email ??
          (document.getElementById('staff-email') as HTMLInputElement | null)?.value ??
          '',
      };
    if (title === 'Fiók letiltása' || title === 'Hozzáférés visszaállítása')
      return { type: 'account', name: context.name || '', disabled: title === 'Fiók letiltása' };
    throw Error('Ismeretlen megerősítő ablak.');
  }
  function confirm(
    title: string,
    action: () => void | Promise<void>,
    context: { email?: string; name?: string; product?: string; unit?: string } = {},
  ) {
    screens.openConfirmation({ title, model: confirmationModel(title, context), action });
  }
  document.getElementById('logout')!.addEventListener('click', async () => {
    try {
      let endpoint;
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration(
          role === 'partner' ? '/partner/' : '/partner-admin/',
        );
        const subscription = await reg?.pushManager?.getSubscription();
        if (subscription) {
          endpoint = subscription.endpoint;
          await subscription.unsubscribe();
        }
      }
      await api('logout', { endpoint });
      location.href = base + '/login';
    } catch (err) {
      toast(err instanceof Error ? err.message : 'A művelet nem sikerült.');
    }
  });
  window.addEventListener('hashchange', () => {
    if (appState.state.data) {
      if (role === 'partner' && ['home', 'order'].includes(currentTab()) && historyPage !== 1) {
        historyPage = 1;
        load().catch((e) => toast(e.message));
      } else render();
      window.scrollTo(0, 0);
    }
  });
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstall = event as Event & { prompt(): Promise<unknown> };
    document.getElementById('install-app')!.hidden = false;
  });
  document.getElementById('install-app')!.addEventListener('click', async () => {
    if (deferredInstall) {
      await deferredInstall.prompt();
      deferredInstall = null;
      document.getElementById('install-app')!.hidden = true;
    }
  });
  if ('serviceWorker' in navigator)
    navigator.serviceWorker
      .register(base + '/sw.js', { scope: base + '/' })
      .catch(() => toast('A telepíthető mód nem indult el; az oldal böngészőből használható.'));
  load().catch((err) => {
    const host = document.createElement('div');
    host.id = 'react-app-root';
    content.replaceChildren(host);
    screens.mountError(host, { message: err.message, onRetry: () => location.reload() });
  });

  function openProductPicker(onSelect: (product: { id: string; name: string }) => void) {
    screens.openProductPicker({
      products: appState.state.data.products,
      favoriteProductIds: appState.state.data.favoriteProductIds || [],
      onFavorite: async (productId, active) => {
        await api('favorites', { productId, favorite: active });
        appState.state.data.favoriteProductIds = (
          appState.state.data.favoriteProductIds || []
        ).filter((id) => id !== productId);
        if (active) appState.state.data.favoriteProductIds.push(productId);
      },
      onSelect: (product) => onSelect(product),
      onClose: () => document.getElementById('quantity')?.focus(),
      onError: (error) => toast(error instanceof Error ? error.message : 'A művelet nem sikerült.'),
    });
  }

  setInterval(() => load(true), 5000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) load(true);
  });
  window.addEventListener('online', () => load(true));

  screens.refreshView = render;
}
