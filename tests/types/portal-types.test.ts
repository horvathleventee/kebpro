import { getLinePrice, getUnitPrice } from '../../portal/client/ts/order-pricing';
import { currentTab } from '../../portal/client/ts/navigation';
import { createApplicationState } from '../../portal/client/ts/application-state';
import { createPortalApi } from '../../portal/client/ts/api';

getUnitPrice([{ id: 'a', prices: { kg: 1200, db: null } }], { productId: 'a', unit: 'kg' });
getLinePrice([], { productId: 'a', unit: 'db', quantity: 2 });
currentTab('staff', { hash: '#calls' });
// @ts-expect-error Prices must be numeric or null.
getUnitPrice([{ id: 'a', prices: { kg: '1200' } }], { productId: 'a', unit: 'kg' });
// @ts-expect-error Order units are restricted to supported units.
getUnitPrice([], { productId: 'a', unit: 'litre' });
// @ts-expect-error Quantities are numbers, not strings.
getLinePrice([], { productId: 'a', unit: 'db', quantity: '2' });
// @ts-expect-error Unknown roles must not be passed to navigation.
currentTab('driver', { hash: '#calls' });

const state = createApplicationState({ quantity: 2, note: '' });
state.patch({ quantity: 3 });
// @ts-expect-error State patches cannot replace numeric quantities with strings.
state.patch({ quantity: '3' });
// @ts-expect-error API options require a CSRF token and the other request callbacks.
createPortalApi({ base: '/partner' });
