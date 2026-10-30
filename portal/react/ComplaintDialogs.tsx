import React, {useEffect, useRef, useState} from 'react';
export function PhotoViewer({id,label,base,onClose}: {id:string;label:string;base:string;onClose():void}) {
 const dialog=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{dialog.current?.showModal();close.current?.focus();},[]);
 return <dialog ref={dialog} className="complaint-photo-viewer" aria-labelledby="photo-viewer-title" onClose={onClose}><h2 id="photo-viewer-title">{label}</h2><button ref={close} type="button" className="button secondary" onClick={()=>dialog.current?.close()}>Bezárás</button><img src={base+'/api/complaint-photo/'+encodeURIComponent(id)} alt={label}/></dialog>;
}
export function ExportDialog({file,url,onClose}: {file:File;url:string;onClose():void}) {
 const dialog=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null),[error,setError]=useState('');
 let canShare=false;const shareData={files:[file],title:'Kebpro bejelentés'};
 try{canShare=Boolean(typeof navigator.share==='function'&&navigator.canShare?.(shareData));}catch{}
 useEffect(()=>{dialog.current?.showModal();close.current?.focus();},[]);
 async function share(){try{await navigator.share(shareData);}catch(error){if(!(error instanceof Error)||error.name!=='AbortError')setError('A mentés nem sikerült. Próbáld újra.');}}
 return <dialog ref={dialog} className="export-dialog" aria-labelledby="export-title" onClose={onClose}><h2 id="export-title">Bejelentés mentése</h2><p>A fájl tartalmazza a bejelentést, a választ és a csatolt képeket. A mentett fájl személyes adatokat is tartalmazhat.</p><div className="dialog-actions"><button ref={close} type="button" className="button secondary" id="export-close" onClick={()=>dialog.current?.close()}>Vissza a bejelentésekhez</button>{canShare?<button type="button" className="button primary" onClick={share}>Mentés / megosztás</button>:<a className="button primary" href={url} download="kebpro-bejelentes.html" target="_blank" rel="noopener">Fájl letöltése</a>}</div><p className="small muted">A mentést a telefon saját mentési vagy megosztási felületén fejezheted be.</p><p id="export-error" role="alert">{error}</p></dialog>;
}
