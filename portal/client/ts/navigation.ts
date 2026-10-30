import type { PortalRole } from './types';

export function currentTab(role: PortalRole, location: { hash: string }): string {
  const allowed =
    role === 'staff'
      ? [
          'dashboard',
          'packing',
          'complaints',
          'news',
          'settings',
          'notifications',
          'applications',
          'calls',
          'products',
        ]
      : ['home', 'order', 'news', 'history', 'reports', 'settings'];
  const tab = location.hash.slice(1);
  return allowed.includes(tab) ? tab : allowed[0];
}
