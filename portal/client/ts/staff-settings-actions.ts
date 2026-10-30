interface StaffAccount {
  id: string;
  status: string;
  company?: string;
  username: string;
}
interface StaffSettingsContext {
  toast(message: string): void;
  expanded: Set<string>;
  api(path: string, body: object): Promise<unknown>;
  load(): Promise<unknown>;
  confirm(
    title: string,
    action: () => void | Promise<void>,
    context?: { email?: string; name?: string },
  ): void;
  getData(): { accounts: StaffAccount[] };
  openSessionRenewal(): void;
}
export function createStaffSettingsActions(ctx: StaffSettingsContext) {
  return {
    error: (error: Error) => ctx.toast(error.message),
    setExpanded(key: string, expanded: boolean) {
      if (expanded) ctx.expanded.add(key);
      else ctx.expanded.delete(key);
    },
    async saveRoute(id: string, values: FormData, form: HTMLFormElement) {
      await ctx.api('routes', {
        id,
        name: values.get('name'),
        days: values.getAll('days').map(Number),
        reminder: values.get('reminder'),
        cutoff: values.get('cutoff'),
      });
      delete form.dataset.dirty;
      ctx.toast('Túra beállításai elmentve.');
      await ctx.load();
    },
    async savePartnerDays(id: string, values: FormData, form: HTMLFormElement) {
      await ctx.api('partners', { id, routeIds: values.getAll('routeIds') });
      delete form.dataset.dirty;
      ctx.toast('Kiszállítási napok mentve.');
      await ctx.load();
    },
    async reschedule(values: FormData, form: HTMLFormElement) {
      await ctx.api('route-reschedule', {
        routeId: values.get('routeId'),
        from: values.get('from'),
        to: values.get('to'),
      });
      delete form.dataset.dirty;
      form.reset();
      ctx.toast('A túra áthelyezését elmentettük.');
      await ctx.load();
    },
    invite(email: string) {
      ctx.confirm(
        'Céges munkatárs meghívása',
        async () => {
          await ctx.api('invitations', { email });
          await ctx.load();
          ctx.toast('A meghívót átadtuk a levelezőszervernek.');
        },
        { email },
      );
    },
    revoke(id: string) {
      ctx.confirm('Meghívó visszavonása', async () => {
        await ctx.api('revoke-invitation', { id });
        await ctx.load();
        ctx.toast('Meghívó visszavonva.');
      });
    },
    accountStatus(id: string) {
      const user = ctx.getData().accounts.find((u) => u.id === id)!,
        status = user.status === 'disabled' ? 'approved' : 'disabled';
      ctx.confirm(
        status === 'disabled' ? 'Fiók letiltása' : 'Hozzáférés visszaállítása',
        async () => {
          await ctx.api('accounts', { id: user.id, status });
          await ctx.load();
          ctx.toast('Hozzáférés módosítva.');
        },
        { name: user.company || user.username },
      );
    },
    extend: ctx.openSessionRenewal,
  };
}
