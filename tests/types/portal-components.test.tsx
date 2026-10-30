import React from 'react';
import { DraftStatus } from '../../portal/react/DraftStatus';
import { createViewStore, PortalView } from '../../portal/react/PortalView';
import { News } from '../../portal/react/News';
import { Calls } from '../../portal/react/Calls';
import { Packing } from '../../portal/react/Packing';
import { PhotoViewer, ExportDialog } from '../../portal/react/ComplaintDialogs';
import { ProductPicker } from '../../portal/react/ProductPicker';
import { SessionRenewal } from '../../portal/react/SessionDialogs';
import { TokenForm } from '../../portal/react/AuthTokenForm';
import type { PortalScreens } from '../../portal/react/screens';

const store = createViewStore();
store.publish('home', <div>Rendelések</div>);
<PortalView store={store} />;
<DraftStatus error="" exists={true} date="hétfő" count={1} open={true} onDiscard={() => {}} />;
// @ts-expect-error The quantity of draft items must be numeric.
<DraftStatus error="" exists={true} date="hétfő" count="egy" open={true} onDiscard={() => {}} />;
// @ts-expect-error A view name must be a string.
store.publish(5, <div />);
<News
  news={[{ id: '1', kind: 'Hír', createdAt: '2026-10-01', title: 'Cím', body: 'Szöveg' }]}
  onRefresh={() => {}}
/>;
// @ts-expect-error News items need their publication date and text.
<News news={[{ id: '1' }]} onRefresh={() => {}} />;
<Calls
  data={{ partners: [], routes: [] }}
  mode="today"
  date=""
  route=""
  onMode={() => {}}
  onFilter={() => {}}
/>;
<Packing
  data={{ responses: [], totals: [{ name: 'Gyros', quantity: 2, unit: 'kg' }], routes: [] }}
  date=""
  route=""
  onFilter={() => {}}
/>;
// @ts-expect-error Packing quantities are numbers.
const invalidQuantity: React.ComponentProps<typeof Packing>['data']['totals'][number]['quantity'] =
  '2';
<Packing
  data={{
    responses: [],
    totals: [{ name: 'Gyros', quantity: invalidQuantity, unit: 'kg' }],
    routes: [],
  }}
  date=""
  route=""
  onFilter={() => {}}
/>;
<PhotoViewer id="id" label="Címke" base="/partner" onClose={() => {}} />;
<ExportDialog file={new File([], 'report.html')} url="blob:report" onClose={() => {}} />;
<ProductPicker
  products={[{ id: 'p', name: 'Gyros' }]}
  favoriteProductIds={[]}
  onFavorite={async () => {}}
  onSelect={() => {}}
  onClose={() => {}}
  onError={() => {}}
/>;
<SessionRenewal
  staff={true}
  expiresAt="2026-11-01"
  onRenew={async () => {}}
  onLater={() => {}}
  onClose={() => {}}
/>;
<TokenForm type="reset" base="/partner" token="token" />;
// @ts-expect-error A product needs an identifier and name.
const invalidProduct: React.ComponentProps<typeof ProductPicker>['products'][number] = { id: 'p' };
<ProductPicker
  products={[invalidProduct]}
  favoriteProductIds={[]}
  onFavorite={async () => {}}
  onSelect={() => {}}
  onClose={() => {}}
  onError={() => {}}
/>;
// @ts-expect-error Only supported token form types may be used.
<TokenForm type="other" base="/partner" token="token" />;
declare const bridge: PortalScreens;
declare const host: HTMLElement;
// @ts-expect-error The news view requires news data and its refresh callback.
bridge.renderScreen('News', host, {});
// @ts-expect-error Screen names are limited to registered components.
bridge.renderScreen('MissingScreen', host, {});
