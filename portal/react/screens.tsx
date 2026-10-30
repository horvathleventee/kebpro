import React from 'react';
import { createViewStore, PortalView } from './PortalView';
import { startPortalController } from '../client/ts/controller';
import { DraftStatus } from './DraftStatus';
import { flushSync } from 'react-dom';
import { PushWelcome, SessionRenewal } from './SessionDialogs';
import { Confirmation } from './Confirmation';
import { PhotoViewer, ExportDialog } from './ComplaintDialogs';
import { Navigation, MobileNavigation } from './Navigation';
import { ProductPicker } from './ProductPicker';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { Calls } from './Calls';
import { Packing } from './Packing';
import { News } from './News';
import { Home } from './Home';
import { History } from './History';
import { Reports } from './Reports';
import { Order } from './Order';
import { Dashboard } from './Dashboard';
import { StaffComplaints } from './StaffComplaints';
import { Applications } from './Applications';
import { StaffNews } from './StaffNews';
import { PartnerSettings } from './PartnerSettings';
import { StaffSettings } from './StaffSettings';
import { Products } from './Products';
import { Notifications } from './Notifications';
let root: Root | null = null,
  rootElement: HTMLElement | null = null,
  navRoot: Root | null = null,
  mobileNavRoot: Root | null = null,
  confirmRoot: Root | null = null,
  confirmKey = 0,
  draftRoot: Root | null = null,
  draftElement: HTMLElement | null = null;
const viewStore = createViewStore();
const screenComponents = {
  StaffSettings: { component: StaffSettings, name: 'staff-settings' },
  Products: { component: Products, name: 'products' },
  Notifications: { component: Notifications, name: 'notifications' },
  PartnerSettings: { component: PartnerSettings, name: 'partner-settings' },
  Dashboard: { component: Dashboard, name: 'dashboard' },
  Order: { component: Order, name: 'order' },
  StaffComplaints: { component: StaffComplaints, name: 'complaints' },
  History: { component: History, name: 'history' },
  Reports: { component: Reports, name: 'reports' },
  Applications: { component: Applications, name: 'applications' },
  Home: { component: Home, name: 'home' },
  StaffNews: { component: StaffNews, name: 'staff-news' },
  Calls: { component: Calls, name: 'calls' },
  News: { component: News, name: 'news' },
  Packing: { component: Packing, name: 'packing' },
};

function renderScreen(element: HTMLElement, screen: React.ReactNode, name: string) {
  if (rootElement !== element) {
    if (root) root.unmount();
    root = createRoot(element);
    rootElement = element;
    root.render(<PortalView store={viewStore} />);
  }
  viewStore.publish(name, screen);
}

function openDialog<P extends { onClose?: () => void }>(
  Component: React.ComponentType<P>,
  props: P,
) {
  const host = document.createElement('div');
  document.body.append(host);
  const dialogRoot = createRoot(host);
  flushSync(() =>
    dialogRoot.render(
      <Component
        {...props}
        onClose={() => {
          setTimeout(() => {
            dialogRoot.unmount();
            host.remove();
            props.onClose?.();
          }, 0);
        }}
      />,
    ),
  );
}
const screens = {
  startPortal() {
    startPortalController(screens);
  },
  renderDraft(element: HTMLElement, props: React.ComponentProps<typeof DraftStatus>) {
    if (draftElement !== element) {
      if (draftRoot) draftRoot.unmount();
      draftRoot = createRoot(element);
      draftElement = element;
    }
    draftRoot!.render(<DraftStatus {...props} />);
  },
  openConfirmation({
    title,
    model,
    action,
  }: Omit<React.ComponentProps<typeof Confirmation>, 'dialog'>) {
    const dialog = document.getElementById('confirm-dialog') as HTMLDialogElement;
    if (!confirmRoot) confirmRoot = createRoot(dialog);
    confirmRoot.render(
      <Confirmation
        key={++confirmKey}
        title={title}
        model={model}
        action={action}
        dialog={dialog}
      />,
    );
  },
  openPushWelcome(
    props: Omit<React.ComponentProps<typeof PushWelcome>, 'onClose'> & { onClose?: () => void },
  ) {
    openDialog(PushWelcome, { ...props, onClose: props.onClose || (() => {}) });
  },
  openSessionRenewal(
    props: Omit<React.ComponentProps<typeof SessionRenewal>, 'onClose'> & { onClose?: () => void },
  ) {
    openDialog(SessionRenewal, { ...props, onClose: props.onClose || (() => {}) });
  },
  openPhoto(
    props: Omit<React.ComponentProps<typeof PhotoViewer>, 'onClose'> & { onClose?: () => void },
  ) {
    openDialog(PhotoViewer, { ...props, onClose: props.onClose || (() => {}) });
  },
  openExport(
    props: Omit<React.ComponentProps<typeof ExportDialog>, 'onClose'> & { onClose?: () => void },
  ) {
    openDialog(ExportDialog, { ...props, onClose: props.onClose || (() => {}) });
  },
  renderNavigation({
    role,
    active,
    complaints,
    applications,
  }: {
    role: 'staff' | 'partner';
    active: string;
    complaints: number;
    applications: number;
  }) {
    const nav = document.querySelector(role === 'staff' ? '.staff-desktop-nav' : '.partner-nav')!;
    if (!navRoot) navRoot = createRoot(nav);
    navRoot.render(<Navigation role={role} active={active} />);
    if (role === 'staff') {
      if (!mobileNavRoot) mobileNavRoot = createRoot(document.querySelector('.staff-mobile-nav')!);
      mobileNavRoot.render(
        <MobileNavigation active={active} complaints={complaints} applications={applications} />,
      );
    }
  },
  openProductPicker(
    props: Omit<React.ComponentProps<typeof ProductPicker>, 'onClose'> & { onClose?: () => void },
  ) {
    const host = document.createElement('div');
    document.body.append(host);
    const dialogRoot = createRoot(host);
    dialogRoot.render(
      <ProductPicker
        {...props}
        onClose={() => {
          setTimeout(() => {
            dialogRoot.unmount();
            host.remove();
            props.onClose?.();
          }, 0);
        }}
      />,
    );
  },
  renderScreen<K extends keyof typeof screenComponents>(
    screen: K,
    element: HTMLElement,
    props: React.ComponentProps<(typeof screenComponents)[K]['component']>,
  ) {
    const entry = screenComponents[screen];
    if (!entry) throw new Error('Unknown portal screen: ' + screen);
    const Component = entry.component as React.ComponentType<typeof props>;
    renderScreen(
      element,
      React.createElement(Component, props as React.Attributes & typeof props),
      entry.name,
    );
  },
  mountError(element: HTMLElement, props: { message: string; onRetry(): void }) {
    renderScreen(
      element,
      <>
        <div className="notice warning">{props.message}</div>
        <button className="button secondary" id="retry-load" onClick={props.onRetry}>
          Újrapróbálom
        </button>
      </>,
      'error',
    );
  },
  refreshView: undefined as undefined | (() => void),
  unmount() {
    if (root) root.unmount();
    root = null;
    rootElement = null;
  },
};

declare global {
  interface Window {
    KebproReactScreens: typeof screens;
  }
}
window.KebproReactScreens = screens;

export type PortalScreens = typeof screens;
