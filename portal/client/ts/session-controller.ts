import type { PortalRole } from './types';
interface LoginSession { canExtend?: boolean; expiresAt: string; }
interface SessionContext {
 role: PortalRole; appState: {state: {data: {id?: string; currentUserId?: string; loginSession: LoginSession}}};
 screens: {openSessionRenewal(props: {staff: boolean; expiresAt: string; onLater(): void; onRenew(): Promise<void>}): void};
 api(path: string, body: {expiresAt: string}): Promise<{loginSession: LoginSession}>;
 render(): void; toast(message: string): void; operationTime(value: string): string;
 document: Pick<Document, 'querySelector'>; localStorage: Pick<Storage, 'getItem' | 'setItem'>;
}
export function createSessionController(ctx: SessionContext){
const {role,appState,screens,api,render,toast,operationTime,document,localStorage}=ctx;
let sessionReminderShown='',sessionSnoozedUntil=0;
function sessionReminderKey(){return 'kebpro-session-reminder:'+role+':'+(appState.state.data.id||appState.state.data.currentUserId)+':'+appState.state.data.loginSession.expiresAt;}
function offerSessionRenewal(){
 if(!appState.state.data.loginSession?.canExtend||document.querySelector('dialog[open]'))return;
 const key=sessionReminderKey();if(sessionReminderShown===key||Date.now()<sessionSnoozedUntil)return;
 try{if(Number(localStorage.getItem(key))>Date.now())return;}catch{}
 openSessionRenewal();
}
function openSessionRenewal(){
 if(!appState.state.data.loginSession?.canExtend||document.querySelector('dialog[open]'))return;
 const expiresAt=appState.state.data.loginSession.expiresAt,key=sessionReminderKey();sessionReminderShown=key;
 const snooze=()=>{sessionSnoozedUntil=Date.now()+86400000;sessionReminderShown='';try{localStorage.setItem(key,String(sessionSnoozedUntil));}catch{}};
 screens.openSessionRenewal({staff:role==='staff',expiresAt,onLater:snooze,onRenew:async()=>{const result=await api('extend-session',{expiresAt});appState.state.data.loginSession=result.loginSession;render();toast('Meghosszabbítottuk a belépésedet eddig: '+operationTime(result.loginSession.expiresAt));}});
}


return {offerSessionRenewal,openSessionRenewal};
}
