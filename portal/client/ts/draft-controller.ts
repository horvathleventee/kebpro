import type { PortalRole, PricedOrderItem } from './types';
type DraftItem = PricedOrderItem & { name: string };
type Editing = { id: string; revision: number } | null;
interface Draft { cart: DraftItem[]; note: string; orderDate: string; editing: Editing; requestId: string; }
interface DraftResponse { requestId?: string; changeIds?: string[]; }
export interface DraftStore { read(): Draft | null; clear(): void; save(value: Draft): void; }
interface DraftContext {
 role: PortalRole; getStorage(): Storage; createStore(storage: Storage, id: string): DraftStore;
 getState(): { data: { id: string; history: DraftResponse[]; currentResponses?: DraftResponse[] }; cart: DraftItem[]; note: string; editing: Editing; requestId: string };
 setState(changes: Draft): void; setError(message: string): void; chosenDelivery(): { date: string }; toast(message: string): void; showStatus(): void;
}
export function createDraftController(ctx: DraftContext){
 let store: DraftStore | undefined, ready=false, fingerprint='';
 function snapshot(){const {cart,note,editing,requestId}=ctx.getState();return {cart,note,orderDate:ctx.chosenDelivery().date,editing,requestId};}
 function restore(){
  if(ctx.role!=='partner'||ready)return;ready=true;
  try{
   const {data}=ctx.getState();store=ctx.createStore(ctx.getStorage(),data.id);const saved=store.read();
   if(saved){if([...data.history,...(data.currentResponses||[])].some(r=>r.requestId===saved.requestId||(r.changeIds||[]).includes(saved.requestId))){store.clear();return;}
    ctx.setState({cart:saved.cart,note:saved.note,orderDate:saved.orderDate,editing:saved.editing,requestId:saved.requestId});fingerprint=JSON.stringify(snapshot());ctx.toast('Visszatöltöttük a rendelési piszkozatodat. Még nincs beküldve.');}
  }catch{ctx.setError('A helyi piszkozatot nem sikerült betölteni vagy elérni. A tartós mentés nem garantált.');}
 }
 function save(){
  if(ctx.role!=='partner'||!ready)return;
  try{const value=snapshot(),next=JSON.stringify(value);if(next!==fingerprint){if(!store)throw Error('Storage unavailable');store.save(value);fingerprint=next;ctx.setError('');}}
  catch{ctx.setError('Nem sikerült menteni ezen az eszközön. Bezáráskor a kosár elveszhet.');}
  ctx.showStatus();
 }
 return {restore,save};
}
