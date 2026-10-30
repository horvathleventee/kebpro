import React, {useSyncExternalStore} from 'react';
import type { ReactNode } from 'react';
interface ViewSnapshot {name: string; screen: ReactNode;}
type Listener = () => void;
export function createViewStore() {
 let snapshot: ViewSnapshot | null=null;const listeners=new Set<Listener>();
 return {
  getSnapshot:()=>snapshot,
  subscribe(listener: Listener){listeners.add(listener);return ()=>listeners.delete(listener);},
  publish(name: string,screen: ReactNode){snapshot={name,screen};for(const listener of listeners)listener();}
 };
}
export function PortalView({store}: {store: ReturnType<typeof createViewStore>}) {
 const view=useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot);
 return view?<div id={'react-'+view.name+'-root'} data-react-screen>{view.screen}</div>:null;
}
