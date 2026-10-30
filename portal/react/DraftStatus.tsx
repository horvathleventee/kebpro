import React from 'react';
interface DraftStatusProps {
 error: string; exists: boolean; date: string; count: number; open: boolean; onDiscard(): void;
}
export function DraftStatus({error,exists,date,count,open,onDiscard}: DraftStatusProps) {
 return <><strong>{error?'Piszkozatmentési hiba':'Piszkozat – még nincs beküldve'}</strong><p>{error||'Ezen az eszközön megőrizve. A cég csak sikeres beküldés után látja.'}</p>{exists&&<><p>{date} · {count} tétel{!open?' · A rendelési határidő lejárt.':''}</p><a className="button secondary" href="#order">Kosár megnyitása</a>{' '}<button className="button text-button" data-action="discard-draft" onClick={event=>{event.stopPropagation();onDiscard();}}>Piszkozat törlése</button></>}</>;
}
