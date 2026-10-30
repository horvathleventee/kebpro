interface NamedEntity {
  id: string;
  name: string;
}
type AuditRecord = Record<string, unknown>;
interface AuditChange {
  collection: string;
  id: string;
  before?: AuditRecord | null;
  after?: AuditRecord | null;
}
interface AuditEvent {
  id: string;
  at: string;
  actorName: string;
  action: string;
  changes: AuditChange[];
  [key: string]: unknown;
}
interface AuditData {
  products?: NamedEntity[];
  allPartners?: NamedEntity[];
  routes?: NamedEntity[];
  auditLog?: AuditEvent[];
}
export function createAuditFormatter(getData: () => AuditData) {
  const auditNames: Record<string, string> = {
    products: 'Termék',
    routes: 'Túra',
    partners: 'Partner',
    responses: 'Rendelés',
    news: 'Hír',
    users: 'Fiók',
    staffInvitations: 'Meghívás',
    complaints: 'Bejelentés',
  };
  const auditFields: Record<string, string> = {
    name: 'Név',
    username: 'Felhasználónév',
    role: 'Szerepkör',
    status: 'Állapot',
    active: 'Rendelhető',
    prices: 'Árak',
    promotions: 'Akciók',
    days: 'Napok',
    routeId: 'Túra',
    routeIds: 'Túrák',
    reminder: 'Emlékeztető',
    cutoff: 'Határidő',
    title: 'Cím',
    body: 'Szöveg',
    kind: 'Típus',
    email: 'E-mail',
    revision: 'Változat',
    archivedAt: 'Archiválva',
    archivedBy: 'Archiválta',
    updatedAt: 'Frissítve',
    updatedBy: 'Frissítette',
    partnerId: 'Partner',
    hasReply: 'Van válasz',
    invitedBy: 'Meghívta',
    value: 'Érték',
    kg: 'kg',
    db: 'db',
    karton: 'karton',
  };
  const auditActions: Record<string, string> = {
    prices: 'Ár módosítása',
    promotions: 'Akció módosítása',
    products: 'Termék módosítása',
    routes: 'Túra módosítása',
    partners: 'Partner beosztása',
    archive: 'Rendelés kezelése',
    news: 'Hír közzététele',
    accounts: 'Fiók kezelése',
    complaints: 'Bejelentés kezelése',
    applications: 'Regisztráció elbírálása',
    invitations: 'Meghívás',
    'revoke-invitation': 'Meghívás visszavonása',
  };
  function auditLabel(key: string): string {
    return (
      auditFields[key] ||
      getData().products?.find((p) => p.id === key)?.name ||
      getData().allPartners?.find((p) => p.id === key)?.name ||
      getData().routes?.find((r) => r.id === key)?.name ||
      key
    );
  }
  function auditValue(value: unknown, key: string): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Igen' : 'Nem';
    if (Array.isArray(value))
      return value.length ? value.map((v) => auditValue(v, key)).join(', ') : '—';
    if (typeof value === 'object')
      return (
        Object.entries(value)
          .map(([k, v]) => auditLabel(k) + ': ' + auditValue(v, k))
          .join(' · ') || '—'
      );
    if (
      key === 'days' &&
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 6
    )
      return ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'][value];
    if (typeof value === 'string') {
      const labels: Record<string, string> = {
        approved: 'Aktív / jóváhagyva',
        disabled: 'Letiltva',
        pending: 'Függőben',
        rejected: 'Elutasítva',
        open: 'Nyitott',
        resolved: 'Lezárt',
        archived: 'Archivált',
        received: 'Beérkezett',
        staff: 'Munkatárs',
        partner: 'Partner',
        discount: 'Kedvezmény',
        fixed: 'Egységes akciós ár',
      };
      return (
        labels[value] ||
        getData().routes?.find((r) => r.id === value)?.name ||
        getData().allPartners?.find((p) => p.id === value)?.name ||
        getData().products?.find((p) => p.id === value)?.name ||
        value
      );
    }
    return String(value);
  }
  function reactAuditEvents() {
    return (getData().auditLog || []).map((e) => ({
      ...e,
      label: auditActions[e.action] || 'Módosítás',
      changes: e.changes.map((change) => {
        const before = change.before || {},
          after = change.after || {},
          keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
            (k) => k !== 'id' && JSON.stringify(before[k]) !== JSON.stringify(after[k]),
          );
        const name =
          after.name ||
          before.name ||
          after.title ||
          before.title ||
          getData().products?.find((p) => p.id === change.id)?.name ||
          getData().allPartners?.find((p) => p.id === change.id)?.name ||
          getData().routes?.find((r) => r.id === change.id)?.name ||
          '';
        return {
          label: (auditNames[change.collection] || change.collection) + (name ? ' · ' + name : ''),
          fields: keys.map((key) => ({
            key,
            label: auditLabel(key),
            before: auditValue(before[key], key),
            after: auditValue(after[key], key),
          })),
        };
      }),
    }));
  }

  return { reactAuditEvents };
}
