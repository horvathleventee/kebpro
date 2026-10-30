import type { PortalRole } from './types';
interface OrderSummary {
  id: string;
  revision?: number;
  kind: string;
  status: string;
}
interface LoaderData {
  name?: string;
  history?: OrderSummary[];
  allOrders?: OrderSummary[];
  orderPage?: { page: number } | null;
  historyPage?: { page: number } | null;
  date?: string;
}
interface LoaderState {
  role: PortalRole;
  data: LoaderData | null;
  automaticLoadPending: boolean;
  mutations: number;
  loadSequence: number;
  ordersPage: number;
  historyPage: number;
  orderView: string;
  archiveSort: string;
  archiveDate: string;
  orderSearch: string;
  selectedDate: string;
  selectedRoute: string;
}
interface LoaderContext {
  content: HTMLElement;
  document: Document;
  window: Window;
  navigator: Navigator;
  api(path: string): Promise<LoaderData>;
  getState(): LoaderState;
  setState(changes: Partial<LoaderState>): void;
  restoreDraft(): void;
  render(): void;
  syncStatus(message: string): void;
  offerSessionRenewal(): void;
  offerPushSetup(): void;
  toast(message: string): void;
  statusLabel: Record<string, string>;
}

export function createPortalLoader(ctx: LoaderContext) {
  const dirtySelector = 'form[data-dirty="true"]';
  const editing = () =>
    ctx.content.contains(ctx.document.activeElement) &&
    ctx.document.activeElement?.matches('input,textarea,select');
  return async function load(automatic = false) {
    let state = ctx.getState();
    if (
      automatic &&
      (ctx.content.querySelector(dirtySelector) ||
        state.automaticLoadPending ||
        ctx.navigator.onLine === false ||
        ctx.document.hidden ||
        state.mutations ||
        ctx.document.querySelector('dialog[open]') ||
        editing())
    )
      return;
    if (automatic) ctx.setState({ automaticLoadPending: true });
    const sequence = state.loadSequence + 1;
    ctx.setState({ loadSequence: sequence });
    const query = new URLSearchParams({
      page: String(state.role === 'staff' ? state.ordersPage : state.historyPage),
    });
    if (state.role === 'staff') {
      query.set('view', state.orderView);
      query.set('sort', state.archiveSort);
      query.set('day', state.archiveDate);
      query.set('search', state.orderSearch);
    }
    if (state.selectedDate) query.set('date', state.selectedDate);
    if (state.selectedRoute) query.set('route', state.selectedRoute);
    try {
      const next = await ctx.api(state.role === 'staff' ? 'admin?' + query : 'me?' + query);
      state = ctx.getState();
      if (sequence !== state.loadSequence) return;
      if (
        automatic &&
        (ctx.content.querySelector(dirtySelector) ||
          state.mutations ||
          ctx.document.querySelector('dialog[open]') ||
          editing())
      )
        return;
      const data = state.data,
        changed = JSON.stringify(next) !== JSON.stringify(data);
      const searchSelection =
        ctx.document.activeElement?.id === 'order-search'
          ? (ctx.document.activeElement as HTMLInputElement).selectionStart
          : null;
      const oldIds = new Set(data?.allOrders?.map((r) => r.id) || []);
      const modified =
        automatic && state.role === 'staff' && data
          ? next.allOrders!.filter((r) =>
              data.allOrders!.some(
                (old) => old.id === r.id && (old.revision || 1) < (r.revision || 1),
              ),
            ).length
          : 0;
      const added =
        automatic && state.role === 'staff' && data
          ? next.allOrders!.filter((r) => !oldIds.has(r.id)).length
          : 0;
      const updates =
        state.role === 'partner' && data
          ? next.history!.filter(
              (r) =>
                r.kind === 'order' &&
                data.history!.some((old) => old.id === r.id && old.status !== r.status),
            )
          : [];
      const changes: Partial<LoaderState> = { data: next };
      if (state.role === 'staff') {
        changes.ordersPage = next.orderPage?.page || 1;
        changes.selectedDate = next.date;
      } else changes.historyPage = next.historyPage?.page || 1;
      ctx.setState(changes);
      ctx.restoreDraft();
      if (state.role !== 'staff') ctx.document.getElementById('identity')!.textContent = next.name!;
      if (!automatic || changed) {
        const y = ctx.window.scrollY;
        ctx.render();
        if (automatic) ctx.window.scrollTo(0, y);
      }
      if (searchSelection !== null) {
        const input = ctx.document.getElementById('order-search') as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.setSelectionRange(searchSelection, searchSelection);
        }
      }
      ctx.syncStatus(
        'Automatikus frissítés · ' +
          new Date().toLocaleTimeString('hu-HU', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Budapest',
          }),
      );
      ctx.offerSessionRenewal();
      if (!automatic) ctx.offerPushSetup();
      if (updates.length)
        ctx.toast(
          updates.length === 1
            ? 'Rendelésed állapota: ' +
                (ctx.statusLabel[updates[0].status] || updates[0].status) +
                '. Részletek a Rendeléseim oldalon.'
            : updates.length + ' rendelésed állapota frissült. Részletek a Rendeléseim oldalon.',
        );
      if (added || modified)
        ctx.toast(
          (added ? added + ' új rendelés. ' : '') +
            (modified ? modified + ' rendelést módosítottak.' : ''),
        );
    } catch (error) {
      ctx.syncStatus('Kapcsolódás újra…');
      if (!automatic) throw error;
    } finally {
      if (automatic) ctx.setState({ automaticLoadPending: false });
    }
  };
}
