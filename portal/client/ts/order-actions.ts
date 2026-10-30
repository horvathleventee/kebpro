import type { OrderUnit } from './types';
interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unit: OrderUnit;
}
interface OrderState {
  data: {
    products: { id: string; name: string }[];
    templates: { id: string; items: OrderItem[] }[];
  };
  cart: OrderItem[];
  note: string;
  editing: { id: string; revision: number } | null;
  orderDate: string;
  requestId: string;
}
interface OrderContext {
  getState(): OrderState;
  setState(changes: Partial<OrderState> & { historyPage?: number }): void;
  render(): void;
  saveDraft(): void;
  toast(message: string): void;
  confirm(title: string, action: () => void | Promise<void>): void;
  openProductPicker(onSelect: (product: { id: string; name: string }) => void): void;
  editHistoryOrder(id: string): void;
  api(path: string, body: object): Promise<unknown>;
  load(): Promise<unknown>;
  currentResponse(): unknown;
  chosenDelivery(): { date: string };
  currentPrice(item: OrderItem): number | null;
  skipDelivery(): void;
  navigate(tab: string): void;
}
export function createOrderActions(ctx: OrderContext) {
  const state = () => ctx.getState();
  const update = (changes: Partial<OrderState> & { historyPage?: number }) => ctx.setState(changes);
  const newRequest = () => crypto.randomUUID();
  return {
    add(values: FormData) {
      try {
        const { data, cart } = state(),
          product = data.products.find((p) => p.id === values.get('productId')),
          amount = Number(values.get('quantity')),
          unit = values.get('unit');
        if (
          !product ||
          (unit !== 'kg' && unit !== 'db' && unit !== 'karton') ||
          !Number.isFinite(amount) ||
          amount <= 0 ||
          amount > 10000 ||
          (unit !== 'kg' && !Number.isInteger(amount))
        )
          throw Error(
            'Ellenőrizd a terméket és a mennyiséget. Darab és karton csak egész szám lehet.',
          );
        const existing = cart.find((i) => i.productId === product.id);
        if (existing) {
          if (existing.unit !== unit)
            throw Error('Ez a termék már szerepel más mértékegységgel. Előbb távolítsd el.');
          if (existing.quantity + amount > 10000) throw Error('Túl nagy mennyiség.');
          existing.quantity = Math.round((existing.quantity + amount) * 100) / 100;
        } else cart.push({ productId: product.id, name: product.name, quantity: amount, unit });
        update({ requestId: newRequest() });
        ctx.render();
        return true;
      } catch (error) {
        ctx.toast((error as Error).message);
        return false;
      }
    },
    quantity(index: number, value: string) {
      const { cart } = state();
      cart[index].quantity = Number(value);
      update({ requestId: newRequest() });
      ctx.saveDraft();
    },
    note(value: string) {
      update({ note: value, requestId: newRequest() });
      ctx.saveDraft();
    },
    selectDelivery(date: string, element: HTMLSelectElement) {
      const change = () => {
        update({ orderDate: date, cart: [], note: '', editing: null, requestId: newRequest() });
        ctx.render();
      };
      const { cart, note, editing, orderDate } = state();
      if (cart.length || note || editing) {
        element.value = orderDate;
        ctx.confirm('Másik kiszállítás kiválasztása', change);
      } else change();
    },
    chooseProduct: ctx.openProductPicker,
    edit(id: string) {
      try {
        ctx.editHistoryOrder(id);
      } catch (error) {
        ctx.toast((error as Error).message);
      }
    },
    cancelEdit() {
      update({ editing: null, cart: [], note: '' });
      ctx.render();
    },
    remove(index: number) {
      const { cart } = state();
      cart.splice(index, 1);
      update({ requestId: newRequest() });
      ctx.render();
    },
    saveTemplate() {
      ctx.confirm('Szokásos rendelési lista mentése', async () => {
        await ctx.api('templates', {
          id: (document.getElementById('template-target') as HTMLSelectElement).value || undefined,
          name: (document.getElementById('template-name') as HTMLInputElement).value,
          items: state().cart,
        });
        await ctx.load();
        ctx.toast('Rendelési lista mentve.');
      });
    },
    loadTemplate(id: string) {
      try {
        const { data, cart, editing } = state();
        if (ctx.currentResponse() && !editing)
          throw Error('Erre a napra már válaszoltál. Előbb nyisd meg a rendelés módosítását.');
        const template = data.templates.find((t) => t.id === id)!;
        const use = () => {
          const items = template.items
            .filter((i) => state().data.products.some((p) => p.id === i.productId))
            .map((i) => ({ ...i }));
          update({ cart: items, requestId: newRequest() });
          ctx.render();
          ctx.toast(
            items.length < template.items.length
              ? 'Lista betöltve; a már nem rendelhető termékeket kihagytuk. Ellenőrizd a kosarat.'
              : 'Lista betöltve. Ellenőrizd a tételeket; még nem adtál le rendelést.',
          );
        };
        if (cart.length) ctx.confirm('Kosár cseréje', use);
        else use();
      } catch (error) {
        ctx.toast((error as Error).message);
      }
    },
    deleteTemplate(id: string) {
      ctx.confirm('Mentett lista törlése', async () => {
        await ctx.api('templates', { id, remove: true });
        await ctx.load();
      });
    },
    review() {
      try {
        const { data, cart, note } = state(),
          unavailable = cart.filter((i) => !data.products.some((p) => p.id === i.productId));
        if (unavailable.length)
          throw Error(
            'Ezek most nem rendelhetők: ' +
              unavailable.map((i) => i.name).join(', ') +
              '. Távolítsd el őket a kosárból.',
          );
        const expectedPrices = cart.map(ctx.currentPrice);
        if (expectedPrices.some((p) => p === null))
          throw Error(
            'Az egyik termékhez nincs megadva ár. Kérjük, fordulj az értékesítő kollégákhoz az ár beállításához.',
          );
        ctx.confirm('Ellenőrizd a rendelésed', async () => {
          const current = state();
          update({ historyPage: 1 });
          const result = (await ctx.api('responses', {
            kind: 'order',
            date: ctx.chosenDelivery().date,
            items: current.cart,
            expectedPrices,
            note: current.note,
            requestId: current.requestId,
            responseId: current.editing?.id,
            revision: current.editing?.revision,
          })) as { response: { id: string } };
          update({ cart: [], note: '', editing: null, requestId: newRequest() });
          ctx.saveDraft();
          await ctx.load();
          ctx.navigate('history');
          ctx.toast('Rendelés rögzítve: ' + result.response.id.slice(0, 8).toUpperCase());
        });
      } catch (error) {
        ctx.toast((error as Error).message);
      }
    },
    skip: ctx.skipDelivery,
  };
}
