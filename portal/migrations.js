const d = require('./domain');
function migrateDailyRoutes(state, now = new Date()) {
  if (state.dailyRoutesVersion === 1) return;
  const dayOf = (date) => new Date(date + 'T12:00:00Z').getUTCDay();
  const assignments = state.partners.map((p) => ({
    id: p.id,
    day: dayOf(d.nextDelivery(state, p, now).date),
  }));
  state.previousRoutes = structuredClone(state.routes);
  const names = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
  state.routes = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
    id: 'route-' + (day || 7),
    name: names[day] + 'i túra',
    days: [day],
    fixedDay: day,
    reminder: '09:00',
    cutoff: '14:00',
  }));
  state.routes.forEach((r) => {
    r.name =
      {
        1: 'Hétfői',
        2: 'Keddi',
        3: 'Szerdai',
        4: 'Csütörtöki',
        5: 'Pénteki',
        6: 'Szombati',
        0: 'Vasárnapi',
      }[r.fixedDay] + ' túra';
  });
  for (const p of state.partners)
    p.routeId = 'route-' + (assignments.find((a) => a.id === p.id).day || 7);
  for (const r of state.responses) {
    r.previousRouteId = r.routeId;
    r.routeId = 'route-' + (dayOf(r.date) || 7);
  }
  state.dailyRoutesVersion = 1;
}
function migrateContactPhones(state) {
  for (const partner of state.partners) {
    if (partner.phone === undefined)
      partner.phone = state.users?.find((user) => user.partnerId === partner.id)?.phone || '';
  }
}
function migrateChickenVariants(state) {
  const old = state.products.find(
    (p) => p.id === 'product-9' && p.name === 'Gy.f. sült csirke comb kebab',
  );
  if (!old) return;
  if (state.chickenAvailabilityVersion !== 1) {
    old.active = true;
    state.chickenAvailabilityVersion = 1;
  }
  for (const variant of [
    { id: 'frozen-chicken-1kg', name: 'Gy.f. sült csirke comb kebab · 1 kg/zacskó, 10 kg/karton' },
    {
      id: 'frozen-chicken-1_5kg',
      name: 'Gy.f. sült csirke comb kebab · 1,5 kg/zacskó, 9 kg/karton',
    },
  ]) {
    if (!state.products.some((p) => p.id === variant.id))
      state.products.push({ ...variant, active: true, orderUnit: 'karton' });
  }
}
module.exports = { migrateDailyRoutes, migrateChickenVariants, migrateContactPhones };
