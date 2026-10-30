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
module.exports = { migrateDailyRoutes };
