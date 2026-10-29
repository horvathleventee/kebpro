"use strict";
const role = document.body.dataset.role;
const base = role === "staff" ? "/partner-admin" : "/partner";
const csrf = document.querySelector('meta[name="csrf-token"]').content;
const content = document.getElementById("content");
let data, cart = [], note = "", requestId = crypto.randomUUID(), newsRequestId = crypto.randomUUID();
let automaticLoadPending=false;
let ordersPage=1,historyPage=1,searchTimer;
let productSearch='',partnerSearch='',pricePartner='',complaintRequests={};
let orderView="new", archiveSort="createdAt", archiveDate="", orderSearch="", loadSequence=0, mutations=0, routeSettingsOpen=false;
let orderDate="", editing=null;
let draftStore, draftReady=false, draftError='', draftFingerprint='';
function draftState(){return {cart,note,orderDate:chosenDelivery().date,editing,requestId};}
function restoreDraft(){
 if(role!=='partner'||draftReady)return;draftReady=true;
 try{
  draftStore=KebproDrafts.create(localStorage,data.id);const saved=draftStore.read();
  if(saved){
   if([...data.history,...(data.currentResponses||[])].some(r=>r.requestId===saved.requestId||(r.changeIds||[]).includes(saved.requestId))){draftStore.clear();return;}
   cart=saved.cart;note=saved.note;orderDate=saved.orderDate;editing=saved.editing;requestId=saved.requestId;
   draftFingerprint=JSON.stringify(draftState());toast('Visszatöltöttük a rendelési piszkozatodat. Még nincs beküldve.');
  }
 }catch{draftError='A helyi piszkozatot nem sikerült betölteni vagy elérni. A tartós mentés nem garantált.';}
}
function saveDraft(){
 if(role!=='partner'||!draftReady)return;
 try{const value=draftState(),fingerprint=JSON.stringify(value);if(fingerprint!==draftFingerprint){if(!draftStore)throw Error('Storage unavailable');draftStore.save(value);draftFingerprint=fingerprint;draftError='';}}
 catch{draftError='Nem sikerült menteni ezen az eszközön. Bezáráskor a kosár elveszhet.';}
 showDraftStatus();
}
function showDraftStatus(){
 const host=document.getElementById('draft-status');if(!host)return;
 const exists=cart.length||note||editing;
 host.hidden=!exists&&!draftError;
 host.innerHTML='<strong>'+ (draftError?'Piszkozatmentési hiba':'Piszkozat – még nincs beküldve')+'</strong><p>'+esc(draftError||'Ezen az eszközön megőrizve. A cég csak sikeres beküldés után látja.')+'</p>'+(exists?'<p>'+esc(dateLabel(chosenDelivery().date))+' · '+cart.length+' tétel'+(!chosenDelivery().open?' · A rendelési határidő lejárt.':'')+'</p><a class="button secondary" href="#order">Kosár megnyitása</a> <button class="button text-button" data-action="discard-draft">Piszkozat törlése</button>':'');
}

let selectedDate = "", selectedRoute = "", deferredInstall, confirmAction, toastTimer, callMode="today";
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function compressComplaintPhoto(file){
 if(!file||!file.size)return null;
 if(!file.type.startsWith('image/')||file.size>20*1024*1024)throw Error('Válassz egy legfeljebb 20 MB-os képet.');
 const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('A képet nem sikerült beolvasni.'));reader.readAsDataURL(file);}),img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('A kép nem nyitható meg. Próbálj másik képet.'));img.src=url;});
  const scale=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('A képet nem sikerült előkészíteni.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [.78,.65,.5,.35]){const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob?.type==='image/jpeg'&&blob.size<=300000){return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('A képet nem sikerült beolvasni.'));reader.readAsDataURL(blob);});}}
  throw Error('A képet nem sikerült eléggé tömöríteni. Próbálj másik képet.');
}
function complaintPhoto(c,admin=false){return [[c.photoId,'Termék vagy probléma'],[c.labelPhotoId,'Termékjelölő címke']].filter(([id])=>id).map(([id,label])=>'<p class="section-gap">'+esc(label)+'<br><button type="button" class="complaint-photo-button" data-action="view-photo" data-photo-id="'+esc(id)+'" data-photo-label="'+esc(label)+'" aria-label="'+esc(label)+' kép nagyítása"><img class="complaint-photo" src="'+(admin?'/partner-admin':'/partner')+'/api/complaint-photo/'+encodeURIComponent(id)+'" alt="'+esc(label)+'" loading="lazy"></button></p>').join('');}
function openComplaintPhoto(id,label){
 if(!/^[a-f0-9-]{36}$/.test(id))throw Error('A kép nem található.');
 const dialog=document.createElement('dialog');dialog.className='complaint-photo-viewer';dialog.setAttribute('aria-labelledby','photo-viewer-title');
 const heading=document.createElement('h2');heading.id='photo-viewer-title';heading.textContent=label;
 const close=document.createElement('button');close.type='button';close.className='button secondary';close.textContent='Bezárás';close.addEventListener('click',()=>dialog.close());
 const img=document.createElement('img');img.src=base+'/api/complaint-photo/'+encodeURIComponent(id);img.alt=label;
 dialog.append(heading,close,img);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();close.focus();
}

const dateLabel = value => new Intl.DateTimeFormat("hu-HU",{month:"long",day:"numeric",weekday:"long",timeZone:"Europe/Budapest"}).format(new Date(value+"T12:00:00Z"));
const dateShort = value => new Intl.DateTimeFormat("hu-HU",{year:"numeric",month:"short",day:"numeric",timeZone:"Europe/Budapest"}).format(new Date(value.length===10 ? value+"T12:00:00Z" : value));
const quantity = n => new Intl.NumberFormat("hu-HU",{maximumFractionDigits:2}).format(n);
const statusLabel = {received:"Beérkezett",archived:"Feldolgozva",skip:"Nem kér szállítást"};
const badge = status => '<span class="badge '+({received:"blue",confirmed:"amber",ready:"green",archived:"green",skip:"gray"}[status]||"gray")+'">'+esc(statusLabel[status]||status)+'</span>';
const timeLabel=value=>new Date(value).toLocaleString('hu-HU',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'});
function orderProgress(r) {
 const descriptions={received:'A rendelésed beérkezett. A Kebpro munkatársainak feldolgozására vár.',archived:'A Kebpro feldolgozta és archiválta a rendelésedet. Ez önmagában nem jelenti, hogy már kiszállították.'};
 if(r.kind!=='order')return '';
 return '<div class="order-progress">'+badge(r.status)+'<p>'+esc(descriptions[r.status]||'A rendelés állapotát a Kebpro frissíti.')+'</p><p class="small muted">'+(r.statusUpdatedAt?'Állapot frissítve: ':r.archivedAt?'Feldolgozva: ':'Beküldve: ')+esc(timeLabel(r.statusUpdatedAt||r.archivedAt||r.createdAt))+'</p></div>';
}
function toast(message) {
  const element = document.getElementById("toast");
  element.textContent = message; element.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>element.hidden=true,6500);
}
async function api(path, body, method="POST") {
  if(path==='responses')saveDraft();
  if(body!==undefined){mutations++;loadSequence++;}
  let response;
  try { response = await fetch(base+"/api/"+path, body === undefined ? {} : {
    method, headers:{"Content-Type":"application/json","X-CSRF-Token":csrf}, body:JSON.stringify(body),
  });
  } catch(error){if(path==='responses'){saveDraft();throw new Error('Nem kaptunk visszaigazolást. A piszkozat megmaradt. Kapcsolódj újra, majd ellenőrizd a Rendeléseim oldalt, mielőtt újrapróbálod.');}throw new Error(navigator.onLine===false?'Nincs internetkapcsolat. Ellenőrizd a kapcsolatot, majd próbáld újra.':'Nem sikerült elérni a kiszolgálót. Próbáld újra később.');} finally {if(body!==undefined)mutations--;}
  if (response.status===401) { location.href=base+"/login"; throw new Error("Jelentkezz be újra."); }
  if(response.status>=500){if(path==='responses')saveDraft();throw new Error('Az alkalmazás kiszolgálója átmenetileg nem elérhető. Próbáld újra később.'+(path==='responses'?' A piszkozat megmaradt; ellenőrizd a Rendeléseim oldalt az újrapróbálás előtt.':''));}
  const result = await response.json();
  if (!response.ok) throw new Error(result.error||"Nem sikerült menteni.");
  return result;
}
function currentTab() {
  const allowed = role==="staff" ? ["dashboard","packing","complaints","news","settings","notifications","applications","calls","products"] : ["home","order","news","history","reports","settings"];
  const tab = location.hash.slice(1);
  return allowed.includes(tab) ? tab : allowed[0];
}
function syncStatus(message){document.getElementById('sync-status').textContent=message;}
function formState(){return [...content.querySelectorAll('form[data-dirty="true"]')].map(form=>({key:form.id?'#'+form.id:'[data-route-form="'+form.dataset.routeForm+'"]',fields:[...form.elements].filter(e=>e.name).map(e=>({name:e.name,index:[...form.elements].indexOf(e),value:e.value,checked:e.checked}))}));}
function restoreForms(saved){for(const item of saved){const form=content.querySelector(item.key);if(!form)continue;form.dataset.dirty='true';for(const field of item.fields){const element=form.elements[field.index];if(element){element.value=field.value;if(field.checked!==undefined)element.checked=field.checked;}}}}
async function load(automatic=false) {
 if(automatic && (content.querySelector('form[data-complaint-order][data-dirty="true"],form[data-general-report][data-dirty="true"],form[data-complaint-reply][data-dirty="true"],form[data-price-product][data-dirty="true"],form[data-promotion-product][data-dirty="true"]') || automaticLoadPending || navigator.onLine===false || document.hidden || mutations || document.querySelector('dialog[open]') || content.contains(document.activeElement) && document.activeElement.matches('input,textarea,select')))return;
 if(automatic)automaticLoadPending=true;
 const sequence=++loadSequence;
 const query=new URLSearchParams({page:String(role==='staff'?ordersPage:historyPage)});if(role==='staff'){query.set('view',orderView);query.set('sort',archiveSort);query.set('day',archiveDate);query.set('search',orderSearch);}
 if(selectedDate)query.set('date',selectedDate);if(selectedRoute)query.set('route',selectedRoute);
 try{
 const next=await api(role==='staff'?'admin?'+query.toString():'me?'+query.toString());
 if(sequence!==loadSequence)return;
 if(automatic && (mutations || document.querySelector('dialog[open]') || content.contains(document.activeElement) && document.activeElement.matches('input,textarea,select')))return;
 const changed=JSON.stringify(next)!==JSON.stringify(data);
 const saved=automatic?formState():[];
 const searchSelection=document.activeElement?.id==='order-search'?document.activeElement.selectionStart:null;
 const loose=automatic?[...content.querySelectorAll('select[data-dirty="true"]')].filter(e=>!e.form).map(e=>({id:e.id,value:e.value})):[];
 const oldIds=new Set(data?.allOrders?.map(r=>r.id)||[]);
 const modified=automatic && role==='staff' && data ? next.allOrders.filter(r=>data.allOrders.some(old=>old.id===r.id && (old.revision||1)<(r.revision||1))).length:0;
 const added=automatic && role==='staff' && data ? next.allOrders.filter(r=>!oldIds.has(r.id)).length:0;
 const updates=role==='partner' && data ? next.history.filter(r=>r.kind==='order' && data.history.some(old=>old.id===r.id && old.status!==r.status)):[];
 data=next;if(role==='staff')ordersPage=data.orderPage?.page||1;else historyPage=data.historyPage?.page||1;restoreDraft();if(role==='staff')selectedDate=data.date;else document.getElementById('identity').textContent=data.name;
 if(!automatic||changed){const y=window.scrollY;render();restoreForms(saved);const chosen=document.getElementById("product");if(chosen?.value){const product=data.products?.find(p=>p.id===chosen.value);if(product)document.getElementById("product-label").textContent=product.name;}for(const item of loose){const element=document.getElementById(item.id);if(element){element.value=item.value;element.dataset.dirty="true";}}if(automatic)window.scrollTo(0,y);}
 if(searchSelection!==null){const input=document.getElementById('order-search');if(input){input.focus();input.setSelectionRange(searchSelection,searchSelection);}}
 syncStatus('Automatikus frissítés · '+new Date().toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'}));
 offerSessionRenewal();
 if(!automatic)offerPushSetup();
 if(updates.length)toast(updates.length===1?'Rendelésed állapota: '+(statusLabel[updates[0].status]||updates[0].status)+'. Részletek a Rendeléseim oldalon.':updates.length+' rendelésed állapota frissült. Részletek a Rendeléseim oldalon.');
 if(added||modified)toast((added?added+' új rendelés. ':'')+(modified?modified+' rendelést módosítottak.':''));
 }catch(error){syncStatus('Kapcsolódás újra…');if(!automatic)throw error;}finally{if(automatic)automaticLoadPending=false;}
}
function heading(eyebrow,title,description,extra="") {
  return '<div class="page-heading"><div><span class="eyebrow">'+esc(eyebrow)+'</span><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div>'+extra+'</div>';
}
function newsCard(news) {
  return '<article class="card news-card"><div class="news-meta"><span class="badge '+(news.kind==="Akció"?"amber":"blue")+'">'+esc(news.kind)+'</span><time>'+esc(dateShort(news.createdAt))+'</time></div><h3>'+esc(news.title)+'</h3><p class="news-body">'+esc(news.body)+'</p></article>';
}
function chosenDelivery(){if(!orderDate)orderDate=data.nextDelivery.date;return data.deliveryOptions.find(d=>d.date===orderDate)||{date:orderDate,cutoffDate:orderDate,cutoff:'—',open:false,route:'Lejárt időpont'};}
function currentResponse() { return (data.currentResponses||data.history).find(r=>r.date===chosenDelivery().date); }
function deliveryPicker(){return '<label class="card delivery-picker">Melyik kiszállításra rendelsz?<select id="order-delivery">'+(!data.deliveryOptions.some(d=>d.date===chosenDelivery().date)?'<option selected value="'+esc(orderDate)+'">'+esc(dateLabel(orderDate))+' · Lejárt / nem elérhető</option>':'')+data.deliveryOptions.map(d=>'<option value="'+esc(d.date)+'" '+(d.date===chosenDelivery().date?'selected':'')+'>'+esc(dateLabel(d.date))+' · '+esc(d.route)+(d.open?'':' · Lezárt')+'</option>').join('')+'</select></label>';}
function savedLists(){return '<details class="card section-gap"><summary>★ Mentett rendelési listáim ('+data.templates.length+')</summary><p class="muted">A betöltés csak a kosarat tölti ki, rendelést nem küld be.</p>'+data.templates.map(t=>'<div class="saved-list"><strong>'+esc(t.name)+'</strong><span>'+t.items.length+' tétel</span><button class="button secondary" data-action="load-template" data-id="'+esc(t.id)+'">Betöltés</button><button class="button text-button" data-action="delete-template" data-id="'+esc(t.id)+'">Törlés</button></div>').join('')+(!data.templates.length?'<p>Ments el egy összeállított kosarat szokásos rendelésként.</p>':'')+'</details>';}
function startEdit(response){editing={id:response.id,revision:response.revision||1};orderDate=response.date;cart=response.items.map(i=>({...i}));note=response.note||'';requestId=crypto.randomUUID();location.hash='order';render();}

function home() {
  const next=data.nextDelivery, response=(data.currentResponses||data.history).find(r=>r.date===next.date);
  const action=response ? '<p>'+badge(response.status)+'</p><a class="button accent section-gap" href="#history">Rögzített válasz megtekintése →</a>' :
    next.open ? '<div class="delivery-actions"><a class="button accent" href="#order">Rendelést adok le →</a><button class="button skip-delivery" data-action="skip"><span aria-hidden="true">✓</span> Most nem kérek szállítást</button><p>Ha most nem rendelsz, jelezd itt, és nem kell telefonon keresnünk.</p></div>' :
    '<p>A rendelési határidő lejárt. Egyeztess a Kebpro munkatársaival.</p>';
  const latest = data.history.find(r=>r.kind==="order");
  return heading("ÜDVÖZLÜNK A PARTNERFELÜLETEN","Jó újra itt látni!","Minden, ami a következő kiszállításhoz szükséges.")+
    '<div class="grid two-col"><section class="delivery-card"><span class="eyebrow">KÖVETKEZŐ KISZÁLLÍTÁS</span><p class="delivery-date">'+esc(dateLabel(next.date))+'</p><p class="route-name">'+esc(next.route)+'</p><p class="delivery-cutoff">Rendelési határidő: <strong>'+esc(dateShort(next.cutoffDate))+' · '+esc(next.cutoff)+'</strong></p>'+action+'</section>'+
    '<section class="card"><div class="card-header"><h2>Gyors áttekintés</h2></div><div class="fact-list"><div class="fact"><span class="fact-icon" aria-hidden="true">↺</span><div><strong>Rendelj a korábbi listádból</strong><p>'+(latest?'A legutóbbi rendelésed '+latest.items.length+' tételt tartalmaz.':'Az első rendelésed után itt is gyorsíthatod a következőt.')+'</p>'+(latest?'<button class="button text-button" data-action="repeat" data-id="'+esc(latest.id)+'">Legutóbbi rendelés betöltése →</button>':'')+'</div></div>'+
    '<div class="fact"><span class="fact-icon" aria-hidden="true">◉</span><div><strong>Szólunk a rendelési határidő előtt</strong><p>A rendelési nap előtti este és a határidő napján emlékeztetünk, ha még nem válaszoltál.</p></div></div><div class="fact"><span class="fact-icon" aria-hidden="true">✓</span><div><strong>Most nem kérsz szállítást?</strong><p>Egy gombnyomással ezt is jelezheted.</p></div></div></div></section></div>'+
    (latest?'<section class="card section-gap"><h2>Legutóbbi rendelésed állapota</h2><p>'+esc(dateLabel(latest.date))+' · #'+esc(latest.id.slice(0,8).toUpperCase())+'</p>'+orderProgress(latest)+'<a href="#history">Rendeléseim megtekintése →</a></section>':'')+
    '<section class="report-shortcut section-gap"><div><h2>Bejelentéseim</h2><p>Rendeléssel kapcsolatos problémák és a Kebpro válaszai.</p></div><a class="button secondary" href="#reports">Bejelentések megtekintése →</a></section>'+
    '<div class="card-header section-gap"><h2>Friss hírek és ajánlatok</h2><a href="#news">Minden hír →</a></div><div class="grid equal-col">'+data.news.slice(0,2).map(newsCard).join("")+'</div>';
}
function money(value){return value===null||value===undefined?'Ár egyeztetendő':new Intl.NumberFormat('hu-HU').format(value)+' Ft';}
function currentPrice(item){return data.products.find(p=>p.id===item.productId)?.prices?.[item.unit]??null;}
function currentLine(item){const price=currentPrice(item);return price===null?null:Math.round(price*Math.round(item.quantity*100)/100);}
function cartSummary(){if(!cart.length)return '';const lines=cart.map(currentLine);return lines.some(v=>v===null)?'Hiányzó ár: kérjük, fordulj az értékesítő kollégákhoz.':'Nettó összesen: '+money(lines.reduce((a,b)=>a+b,0));}
function priceLine(item){const price=item.unitPrice;return price===null||price===undefined?'Ár egyeztetendő':money(price)+' / '+esc(item.unit)+' · '+money(item.lineTotal);}
function order() {
  const next=chosenDelivery(), response=currentResponse();
  const title=deliveryPicker()+savedLists()+heading("RENDELÉS","Mit készítsünk össze?","Kiszállítás: "+dateLabel(next.date)+" · Határidő: "+dateShort(next.cutoffDate)+" "+next.cutoff+" · Az árak nettó értékek");
  if(response && !editing) return title+'<section class="success-panel"><h2>Erre a kiszállításra már válaszoltál.</h2><p>'+badge(response.status)+'</p><p>Azonosító: '+esc(response.id.slice(0,8).toUpperCase())+'</p>'+(response.canEdit?'<button class="button primary" data-action="edit-order" data-id="'+esc(response.id)+'">Válasz / rendelés módosítása</button>':'')+'<a class="button secondary" href="#history">Rendeléseim megtekintése</a></section>';
  if(!next.open) return title+'<div class="notice warning">A rendelési határidő lejárt. Módosítás vagy új rendelés miatt keresd a Kebpro munkatársait.</div>';
  return title+(editing?'<p class="notice">Meglévő válasz módosítása. Csak a véglegesítéssel mentődik.<button class="button text-button" data-action="cancel-edit">Mégsem</button></p>':'')+'<div class="card"> <form id="add-product" class="product-add"><div class="field"><label for="product">Termék</label><input type="hidden" id="product" name="productId"><button class="button secondary product-trigger" type="button" data-action="choose-product" id="product-label">Válassz terméket… ▾</button></div><div class="field"><label for="quantity">Mennyiség</label><input id="quantity" name="quantity" type="number" min="0.01" max="10000" step="0.01" value="1" required></div><div class="field"><label for="unit">Egység</label><select id="unit" name="unit"><option>kg</option><option>db</option><option>karton</option></select></div><button class="button primary" type="submit">Hozzáadom</button></form>'+
    unavailableNotice()+'<div class="cart-items">'+(cart.length?cart.map((item,index)=>'<div class="cart-line"><strong>'+esc(item.name)+'</strong><label>Mennyiség<input type="number" min="0.01" max="10000" step="0.01" data-cart-quantity="'+index+'" value="'+item.quantity+'" aria-label="'+esc(item.name)+' mennyisége"></label><span>'+esc(item.unit)+'</span><span data-line-price="'+index+'">'+esc(money(currentPrice(item)))+' / '+esc(item.unit)+' · '+esc(money(currentLine(item)))+'</span><button data-action="remove-item" data-index="'+index+'" aria-label="'+esc(item.name)+' eltávolítása">×</button></div>').join(""):'<div class="empty">Még üres a rendelésed. Válassz terméket a fenti listából.</div>')+'</div>'+
    '<label for="order-note">Megjegyzés a rendeléshez</label><textarea id="order-note" maxlength="1000" rows="3" placeholder="Van valami, amire figyeljünk?">'+esc(note)+'</textarea><button type="button" class="button secondary section-gap" data-action="save-template" '+(!cart.length?'disabled':'')+'>★ Kosár mentése listaként</button><div class="cart-footer"><p>'+cart.length+' különböző termék · <strong id="cart-total">'+esc(cartSummary())+'</strong></p><button class="button primary" data-action="review" '+(!cart.length?'disabled':'')+'>Rendelés áttekintése →</button></div></div>'+
    '<div class="skip-delivery-panel section-gap"><div><strong>Most nincs szükséged szállításra?</strong><p>Jelezd itt, és a Kebpro munkatársai látják a válaszodat.</p></div><button class="button skip-delivery" data-action="skip"><span aria-hidden="true">✓</span> Most nem kérek szállítást</button></div>';
}
function pager(info,kind){if(!info||info.pages<2)return '';return '<div class="button-row section-gap" aria-label="Lapozás"><button class="button secondary" data-action="page" data-kind="'+kind+'" data-page="'+(info.page-1)+'" '+(info.page<=1?'disabled':'')+'>← Előző</button><span>'+info.page+' / '+info.pages+' oldal · '+info.total+' rendelés</span><button class="button secondary" data-action="page" data-kind="'+kind+'" data-page="'+(info.page+1)+'" '+(info.page>=info.pages?'disabled':'')+'>Következő →</button></div>';}
function history() {
  return heading("KORÁBBI RENDELÉSEK","Rendeléseim","Az archivált rendelések 3 hónapig maradnak meg. A mentett rendelési listáid nem törlődnek.")+
    '<div class="stack">'+(data.history.length?data.history.map(r=>'<article class="card history-card"><div>'+badge(r.status)+'<h3>'+esc(dateLabel(r.date))+'</h3><p class="muted small">Azonosító: '+esc(r.id.slice(0,8).toUpperCase())+'</p>'+
      orderProgress(r)+(r.kind==="order"?'<ul class="history-items">'+r.items.map(item=>'<li>'+esc(item.name)+' · '+quantity(item.quantity)+' '+esc(item.unit)+' · '+priceLine(item)+'</li>').join("")+'</ul>':'<p class="muted">Erre a kiszállításra nem kértél árut.</p>')+
      (r.kind==='order'?'<p><strong>Összesen: '+esc(money(r.total))+'</strong></p>':'')+(r.note?'<p class="muted small section-gap">'+esc(r.note)+'</p>':'')+'</div><div class="stack">'+(r.canEdit?'<button class="button primary" data-action="edit-order" data-id="'+esc(r.id)+'">Módosítás a határidőig</button>':'')+(r.kind==='order'?'<details><summary>Probléma bejelentése</summary><form id="complaint-'+esc(r.id)+'" data-complaint-order="'+esc(r.id)+'"><label>Írd le, mi volt a probléma<textarea name="message" maxlength="2000" required rows="4"></textarea></label><label>Kép a termékről vagy a problémáról<input name="photo" type="file" accept="image/*" required></label><label>Kép a termékjelölő címkéről<input name="labelPhoto" type="file" accept="image/*" required><small>A képeket feltöltés előtt automatikusan tömörítjük.</small></label><button class="button primary">Bejelentés elküldése</button></form></details>':'')+(r.kind==="order"?'<button class="button secondary" data-action="repeat" data-id="'+esc(r.id)+'">Újrarendelés ↺</button>':'')+'</div></article>').join(""):'<div class="empty">Itt jelennek meg majd a rögzített rendeléseid.</div>')+'</div>'+pager(data.historyPage,'history')+partnerComplaints();
}
function partnerComplaints(){const list=[...(data.complaints||[])].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return '<section class="section-gap"><h2>Bejelentéseim</h2><p class="muted">A bejelentésedre itt válaszolnak a munkatársak.</p><div class="stack section-gap">'+(list.length?list.map(c=>'<article class="card"><span class="badge '+(c.status==='resolved'?'green':'amber')+'">'+(c.status==='resolved'?'Lezárva':'Feldolgozásra vár')+'</span><p><strong>'+(c.orderId?'Rendelés: '+esc(dateLabel(c.orderDate))+' · #'+esc(c.orderId.slice(0,8).toUpperCase()):'Általános visszajelzés')+'</strong></p><p class="complaint-message">'+esc(c.message)+'</p>'+complaintPhoto(c)+(c.reply?'<p class="section-gap"><strong>Kebpro válasza:</strong></p><p class="complaint-message">'+esc(c.reply)+'</p>':'<p class="muted">Még nem érkezett válasz.</p>')+'</article>').join(''):'<p class="muted">Még nincs bejelentésed.</p>')+'</div></section>';}
function partnerReports(){return heading('PARTNERI VISSZAJELZÉSEK','Bejelentéseim','Itt találod a korábbi bejelentéseidet és a Kebpro válaszait.')+'<section class="report-shortcut"><div><h2>Probléma a rendeléseddel?</h2><p>A Rendeléseim oldalon válaszd ki az érintett rendelést, majd nyomd meg a „Probléma bejelentése” lehetőséget.</p></div><a class="button secondary" href="#history">Rendeléseim megnyitása →</a></section><section class="card section-gap"><h2>Általános visszajelzés</h2><form data-general-report="true"><label>Üzenet<textarea name="message" maxlength="2000" required rows="4"></textarea></label><label>Kép (nem kötelező)<input name="photo" type="file" accept="image/*"></label><button class="button primary">Üzenet elküldése</button></form></section>'+partnerComplaints();}
function complaintRetentionInfo(c){
 if(c.status!=='resolved')return '';
 const closed=Date.parse(c.resolvedAt||'');
 if(!Number.isFinite(closed))return '<p class="notice">A lezárt bejelentés megőrzési ideje a következő háttérellenőrzéskor indul. A mentéshez használd a letöltés gombot.</p>';
 const expiry=closed+28*86400000,remaining=Math.max(0,Math.ceil((expiry-Date.now())/86400000));
 return '<p class="'+(remaining<=7?'notice complaint-retention-warning':'small muted')+'">'+(remaining<=7?'⚠ ':'')+'Automatikus törlés leghamarabb: '+esc(operationTime(expiry))+'. '+(remaining<=7?'Ha szükséged van rá, töltsd le: törlés után már nem lesz elérhető.':'A bejelentés és a képek letölthetők a törlés előtt.')+'</p>';
}
function staffComplaints(){const list=data.allPartners.flatMap(p=>(p.complaints||[])).sort((a,b)=>(a.status==='resolved')-(b.status==='resolved')||b.createdAt.localeCompare(a.createdAt));return heading('PARTNERI VISSZAJELZÉSEK','Bejelentések','A partnerek rendeléshez kapcsolódó problémáit itt lehet megválaszolni és lezárni.')+'<div class="stack">'+(list.length?list.map(c=>'<article class="card '+(c.status==='open'&&c.orderId?'complaint-urgent':'')+'"><span class="badge '+(c.status==='resolved'?'green':c.orderId?'complaint-alert':'amber')+'">'+(c.status==='resolved'?'Lezárva':c.orderId?'❗ Új reklamáció':'Új / nyitott')+'</span><h2>'+esc(c.partnerName)+'</h2><p>'+(c.orderId?'Rendelés: '+esc(dateLabel(c.orderDate))+' · #'+esc(c.orderId.slice(0,8).toUpperCase()):'Általános visszajelzés')+'</p><p class="small muted">Beérkezett: '+esc(timeLabel(c.createdAt))+'</p><p class="complaint-message section-gap">'+esc(c.message)+'</p>'+complaintPhoto(c,true)+complaintRetentionInfo(c)+'<a class="button secondary section-gap" href="/partner-admin/api/complaints/'+encodeURIComponent(c.id)+'/export" download>Bejelentés letöltése képekkel</a><form id="complaint-reply-'+esc(c.id)+'" data-complaint-reply="'+esc(c.id)+'" data-revision="'+(c.revision||1)+'" class="section-gap"><label>Válasz a partnernek<textarea name="reply" maxlength="2000" rows="3">'+esc(c.reply||'')+'</textarea></label><label>Állapot<select name="status"><option value="open" '+(c.status==='open'?'selected':'')+'>Nyitott</option><option value="resolved" '+(c.status==='resolved'?'selected':'')+'>Lezárva</option></select></label><button class="button primary">Válasz és állapot mentése</button></form></article>').join(''):'<p class="card">Még nincs beérkezett bejelentés.</p>')+'</div>';}
function staffPacking(){const responses=data.responses.filter(r=>r.kind==='order');return heading('KISZÁLLÍTÁS','Összekészítési lista','A kiválasztott nap és túra rendelései alapján, az archivált rendelésekkel együtt.')+'<form id="filters" class="filters"><label>Kiszállítás napja<input name="date" type="date" value="'+esc(selectedDate)+'" required></label><label>Túra<select name="route"><option value="">Minden túra</option>'+data.routes.map(r=>'<option value="'+esc(r.id)+'" '+(r.id===selectedRoute?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select></label></form><section class="card section-gap"><h2>Összesen · '+responses.length+' rendelés</h2><div class="stack section-gap">'+(data.totals.length?data.totals.map(i=>'<div class="total-line"><strong>'+esc(i.name)+'</strong><strong>'+quantity(i.quantity)+' '+esc(i.unit)+'</strong></div>').join(''):'<p>Erre a kiválasztásra nincs rendelés.</p>')+'</div></section><h2 class="section-gap">Partnerenként</h2><div class="order-grid section-gap">'+responses.map(r=>'<article class="card"><h3>'+esc(r.partnerName)+'</h3><p class="muted">'+esc(r.address)+'</p><ul class="history-items">'+r.items.map(i=>'<li>'+esc(i.name)+' · '+quantity(i.quantity)+' '+esc(i.unit)+'</li>').join('')+'</ul>'+(r.note?'<p><strong>Megjegyzés:</strong> '+esc(r.note)+'</p>':'')+'</article>').join('')+'</div>';}
function partnerSettings() {
  return heading("SAJÁT BEÁLLÍTÁSOK","Maradj képben","Válaszd ki, miről szeretnél értesítést kapni.")+sessionSettings()+
    '<div class="grid equal-col"><section class="card"><h2>Értesítések</h2><form id="preferences"><label class="check-line"><input type="checkbox" name="reminders" '+(data.preferences.reminders?'checked':'')+'><span>Rendelési emlékeztetők<small>A rendelési nap előtt és a rendelési napon, ha még nem válaszoltál.</small></span></label><label class="check-line"><input type="checkbox" name="news" '+(data.preferences.news?'checked':'')+'><span>Hírek és akciók<small>Értesítés az új ajánlatokról és céges közleményekről.</small></span></label><button class="button primary">Beállítások mentése</button></form>'+
    '<div class="section-gap"><h3>Értesítés ezen az eszközön</h3><p class="small muted section-gap">Az engedélyezéssel a hírek és akciók is bekapcsolódnak; ezek később külön kikapcsolhatók. A próba csak ezen az eszközön jelenik meg.</p><div class="settings-actions"><button class="button secondary" data-action="enable-push">Engedélyezés</button><button class="button secondary" data-action="test-push">Helyi próbaértesítés</button><button class="button text-button" data-action="disable-push">Eszköz leiratkoztatása</button></div></div></section>'+
    '<div class="stack"><section class="card"><h2>Partneradataid</h2><p class="section-gap"><strong>'+esc(data.name)+'</strong><br><span class="muted">'+esc(data.address)+'</span></p><p class="small muted section-gap">Kiszállítási túra: '+esc([...new Set(data.deliveryOptions.map(d=>d.route))].join(', '))+'</p></section><section class="card"><h2>Kebpro a kezdőképernyőn</h2><p class="muted section-gap">Ha a böngésző felajánlja, válaszd a Telepítés lehetőséget. iPhone-on: Megosztás → Főképernyőhöz adás. A telefonos pushhoz ezután nyisd meg az ikonnal az alkalmazást, és engedélyezd az értesítéseket.</p></section></div></div>';
}

function todoPanel(){
 const t=data.todo||{};
 return '<section class="section-gap"><h2>Napi teendők</h2><p class="muted">Mai rendelési nap: '+esc(t.date?dateLabel(t.date):'')+'</p><div class="todo-grid"><button class="card todo-card" data-action="todo-new"><strong>'+(data.orderCounts?.new||0)+'</strong><span>Feldolgozatlan rendelés</span></button><button class="card todo-card" data-action="todo-calls"><strong>'+(t.missing||0)+'</strong><span>Mai rendelési határidőre nem válaszolt</span></button><a class="card todo-card" href="#applications"><strong>'+(t.pending||0)+'</strong><span>Jóváhagyásra váró regisztráció</span></a></div></section>';
}
function searchMatch(value,query){return String(value).toLocaleLowerCase('hu-HU').includes(String(query).trim().toLocaleLowerCase('hu-HU'));}
function filterPricePartners(){const select=document.getElementById('price-partner-filter');if(!select)return;const partners=[...data.allPartners].filter(p=>searchMatch(p.name,partnerSearch)||p.id===pricePartner).sort((a,b)=>a.name.localeCompare(b.name,'hu'));select.replaceChildren(new Option('Alapárak',''),...partners.map(p=>new Option(p.name,p.id)));select.value=pricePartner;}
function staffProducts(){
 const partners=[...data.allPartners].sort((a,b)=>a.name.localeCompare(b.name,'hu')), chosen=partners.find(p=>p.id===pricePartner);
 return heading('TERMÉKEK','Rendelhető termékek és árak','Az árakat külön kell megadni kg, db és karton egységre. Az üres egyedi árnál az alapár érvényes.')+'<p class="notice warning">Az árak nettó árak. Hiányzó ár esetén a partner nem adhatja le a rendelést; az árakat az értékesítő kollégák állítják be. A korábban rögzített rendelések ára nem változik.</p><div class="card price-search section-gap"><label>Termék keresése<input type="search" id="price-product-search" value="'+esc(productSearch)+'" placeholder="Termék neve"></label><label>Partner keresése az árbeállításhoz<input type="search" id="price-partner-search" value="'+esc(partnerSearch)+'" placeholder="Cég neve"></label><label>Árak megtekintése<select id="price-partner-filter"><option value="">Alapárak</option>'+partners.filter(partner=>searchMatch(partner.name,partnerSearch)||partner.id===pricePartner).map(partner=>'<option value="'+esc(partner.id)+'" '+(partner.id===pricePartner?'selected':'')+'>'+esc(partner.name)+'</option>').join('')+'</select></label></div><div class="stack section-gap">'+data.products.map(p=>'<article class="card" data-price-card="'+esc(p.name)+'" '+(searchMatch(p.name,productSearch)?'':'hidden')+'><div class="saved-list"><div><strong>'+esc(p.name)+'</strong><p>'+(p.active?'Rendelhető':'Átmenetileg nem rendelhető')+'</p><p class="small muted">'+['kg','db','karton'].map(unit=>esc(unit)+': '+esc(money(chosen?(chosen.prices?.[p.id]?.[unit]??p.prices?.[unit]??null):(p.prices?.[unit]??null)))+(chosen&&chosen.prices?.[p.id]?.[unit]!==undefined?' (egyedi)':'')).join(' · ')+'</p></div><button class="button '+(p.active?'secondary':'primary')+'" data-action="product-availability" data-id="'+esc(p.id)+'" data-active="'+(!p.active)+'">'+(p.active?'Rendelés szüneteltetése':'Újra rendelhető')+'</button></div><details class="section-gap"><summary>Árak beállítása</summary><form id="price-'+esc(p.id)+'" data-price-product="'+esc(p.id)+'" class="section-gap"><input type="hidden" name="partnerId" value="'+esc(pricePartner)+'"><p class="small muted">'+(chosen?'Partner: '+esc(chosen.name):'Alapár')+'</p><label>Mértékegység<select name="unit" data-price-unit><option value="kg">kg</option><option value="db">db</option><option value="karton">karton</option></select></label><label>Nettó egységár (Ft)<input name="price" type="number" min="0" max="100000000" step="1" inputmode="numeric" value="'+esc((chosen?chosen.prices?.[p.id]?.kg:p.prices?.kg)??'')+'"></label><p class="small muted">Üres mezővel törölhető a beállított ár; egyedi árnál ezután az alapár érvényes.</p><button class="button primary">Ár mentése</button></form></details><details class="section-gap"><summary>Általános akció minden partnernek</summary><p class="small muted">Nettó árak. A levonás az egyedi és alapárból is érvényesül; a végső ár legalább 0 Ft. A fix akciós ár minden beállított árat helyettesít. Hiányzó árat az akció nem pótol. A módosítás azonnal érvényes, lezáráskor válaszd a Nincs akció lehetőséget.</p>'+['kg','db'].map(unit=>{const promo=p.promotions?.[unit]||{kind:'none',value:''};return '<form id="promotion-'+esc(p.id)+'-'+unit+'" data-promotion-product="'+esc(p.id)+'" class="section-gap"><h3>'+unit+'</h3><input type="hidden" name="unit" value="'+unit+'"><label>Akció típusa<select name="kind"><option value="none" '+(promo.kind==='none'?'selected':'')+'>Nincs akció</option><option value="discount" '+(promo.kind==='discount'?'selected':'')+'>Levonás az árból (Ft / '+unit+')</option><option value="fixed" '+(promo.kind==='fixed'?'selected':'')+'>Egységes akciós ár (Ft / '+unit+')</option></select></label><label>Akció értéke Ft-ban<input name="value" type="number" min="0" max="100000000" step="1" value="'+esc(promo.value)+'"></label><button class="button primary">Akció mentése</button></form>';}).join('')+'</details></article>').join('')+'</div>';
}
function fillPriceForm(form){const product=data.products.find(p=>p.id===form.dataset.priceProduct),partner=data.allPartners.find(p=>p.id===form.elements.partnerId.value),unit=form.elements.unit.value;const value=partner?partner.prices?.[product.id]?.[unit]:product.prices?.[unit];form.elements.price.value=value??'';}

function unavailableNotice(){const items=cart.filter(i=>!data.products.some(p=>p.id===i.productId));return items.length?'<p class="notice warning" role="alert"><strong>Most nem rendelhető:</strong> '+esc(items.map(i=>i.name).join(', '))+'. Távolítsd el ezeket a kosárból a beküldés előtt. A többi tétel megmarad.</p>':'';}
function retentionPanel(){const r=data.retention||{};return '<section class="card section-gap"><h2>Rendelési előzmények megőrzése</h2><p>A legalább 3 hónapja archivált, elmúlt kiszállítású rendelések automatikusan törlődnek. A kezeletlen rendelések és a mentett rendelési listák megmaradnak.</p><p>Törlés naponta, csak friss, sikeres adatmentés után történik. A mentések saját megőrzési idejük szerint járnak le.</p><p>Utolsó ellenőrzés: '+esc(r.lastRun?operationTime(r.lastRun):'Még nem futott')+' · Legutóbb törölve: '+(r.deleted||0)+'</p></section>';}

function staffDashboard() {
 const all=data.allOrders||[], archived=orderView==='archived';

 const visible=all;
 const openComplaints=data.allPartners.reduce((n,p)=>n+(p.complaints||[]).filter(c=>c.status==='open'&&c.orderId).length,0);
 const expiring=data.allPartners.reduce((n,p)=>n+(p.complaints||[]).filter(c=>c.status==='resolved'&&Number.isFinite(Date.parse(c.resolvedAt||''))&&Date.parse(c.resolvedAt)+28*86400000<=Date.now()+7*86400000).length,0);
 return todoPanel()+(expiring?'<p class="notice complaint-retention-warning">⚠ '+expiring+' lezárt bejelentés hamarosan törlődik. <a href="#complaints">Nézd át és szükség esetén töltsd le →</a></p>':'')+'<p class="section-gap"><a '+(openComplaints?'class="complaint-dashboard-alert" ':'')+'href="#complaints">'+(openComplaints?'❗ '+openComplaints+' nyitott reklamáció':'Bejelentések: '+data.allPartners.reduce((n,p)=>n+(p.complaints||[]).filter(c=>c.status==='open').length,0)+' nyitott')+' →</a></p>'+heading('RENDELÉSEK','Rendelések','Az új rendeléseket a pipával helyezheted az archívumba.')+
 '<div class="order-tabs two-tabs" aria-label="Rendelési kategóriák">'+[['new','Új rendelések',data.orderCounts?.new||0],['archived','Archivált rendelések',data.orderCounts?.archived||0]].map(([key,label,count])=>'<button class="button '+(orderView===key?'primary':'secondary')+'" data-action="order-view" data-view="'+key+'" aria-pressed="'+(orderView===key)+'">'+label+' <span>'+count+'</span></button>').join('')+'</div>'+
 (archived?'<div class="card archive-filters"><label>Rendezés és napszűrés alapja<select id="archive-sort"><option value="createdAt" '+(archiveSort==='createdAt'?'selected':'')+'>Rendelés időpontja</option><option value="archivedAt" '+(archiveSort==='archivedAt'?'selected':'')+'>Archiválás időpontja</option></select></label><label>Nap (üresen: minden nap)<input id="archive-date" type="date" value="'+esc(archiveDate)+'"></label><button class="button secondary" data-action="clear-archive-date">Minden nap</button><p class="small muted">Legfrissebb elöl. A napszűrés a fent kiválasztott időpontra vonatkozik.</p></div>':'<p class="muted section-gap">Minden még nem archivált rendelés, kiszállítási naptól függetlenül.</p>')+
 '<label class="order-search section-gap">Partner vagy rendelési azonosító keresése<input id="order-search" type="search" value="'+esc(orderSearch)+'" placeholder="Keresés…"></label>'+
 '<div class="order-grid">'+visible.map(r=>'<article class="card order-card '+(archived?'status-ready':'status-received')+'"><div class="card-header"><span class="badge '+(archived?'green':'blue')+'">'+(archived?'Archivált':r.kind==='skip'?'Módosítva · Lemondva':r.modifiedAt?'Módosítva':'Új rendelés')+'</span><span class="muted small">#'+esc(r.id.slice(0,8).toUpperCase())+'</span></div><h2>'+esc(r.partnerName)+'</h2><p class="muted">'+esc(r.address)+'</p><p class="order-meta"><strong>Kiszállítás: '+esc(dateLabel(r.date))+'</strong><br>'+esc(data.routes.find(t=>t.id===r.routeId)?.name)+'<br>Rendelés: '+esc(timeLabel(r.createdAt))+(r.modifiedAt?'<br>Módosítva: '+esc(timeLabel(r.modifiedAt)):'')+(archived?'<br>Archiválás: '+esc(timeLabel(r.archivedAt)):'')+'</p><ul class="order-lines">'+r.items.map(i=>'<li><span>'+esc(i.name)+'</span><strong>'+quantity(i.quantity)+' '+esc(i.unit)+' · '+priceLine(i)+'</strong></li>').join('')+'</ul><p><strong>Összesen: '+esc(money(r.total))+'</strong></p>'+(r.note?'<div class="order-note"><strong>Megjegyzés</strong><p>'+esc(r.note)+'</p></div>':'')+'<button class="button '+(archived?'secondary':'primary')+' full archive-button section-gap" data-action="'+(archived?'restore-order':'archive-order')+'" data-id="'+esc(r.id)+'">'+(archived?'Vissza az új rendelésekhez':'✓ Kezeltem · Archiválás')+'</button></article>').join('')+'</div>'+(!visible.length?'<div class="card empty">'+(archived?'Nincs a szűrésnek megfelelő archivált rendelés.':'Nincs új rendelés. A beérkező rendelések automatikusan megjelennek.')+'</div>':'')+pager(data.orderPage,'orders');
}

function calls(){
 const card=p=>{const phone=String(p.phone||'').replace(/[^+0-9]/g,'');return '<article class="card"><h3>'+esc(p.name)+'</h3><p>'+esc(p.address)+'</p><p>'+esc(p.phone||'Nincs telefonszám megadva')+'</p>'+(phone&&/^[+]?[0-9]{6,15}$/.test(phone)?'<a class="button primary full" href="tel:'+esc(phone)+'">☎ Partner hívása</a>':'')+'</article>';};
 const sorted=list=>[...list].sort((a,b)=>a.name.localeCompare(b.name,'hu'));
 const switcher='<div class="button-row call-mode"><button class="button '+(callMode==='today'?'primary':'secondary')+'" data-action="calls-mode" data-mode="today" aria-pressed="'+(callMode==='today')+'">Mai rendelési nap</button><button class="button '+(callMode==='manual'?'primary':'secondary')+'" data-action="calls-mode" data-mode="manual" aria-pressed="'+(callMode==='manual')+'">Másik kiszállítási nap</button></div>';
 if(callMode==='manual'){
  const pending=sorted(data.partners.filter(p=>!p.disabled&&!p.response)),skipped=sorted(data.partners.filter(p=>p.response?.kind==='skip'));
  return heading('PARTNEREK','Kit kell még hívni?','Válassz tetszőleges kiszállítási napot és túrát.')+switcher+'<form id="filters" class="filters section-gap"><label>Kiszállítás napja<input name="date" type="date" value="'+esc(selectedDate)+'" required></label><label>Túra<select name="route"><option value="">Minden túra</option>'+data.routes.map(r=>'<option value="'+esc(r.id)+'" '+(r.id===selectedRoute?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select></label></form><h2>Még nem válaszolt ('+pending.length+')</h2><div class="order-grid section-gap">'+(pending.length?pending.map(card).join(''):'<p class="card">Minden beosztott partner válaszolt, vagy nincs partner erre a kiválasztásra.</p>')+'</div><details class="card section-gap"><summary>Most nem kér szállítást ('+skipped.length+')</summary>'+skipped.map(p=>'<p>✓ '+esc(p.name)+'</p>').join('')+'</details>';
 }
 const groups=data.calls||[];
 return heading('MAI RENDELÉSI NAP','Kit kell még hívni?','A mai határidőhöz tartozó kiszállítások és túrák. A lista automatikusan frissül.')+switcher+(groups.length?groups.map(g=>'<section class="section-gap call-delivery"><h2>Kiszállítás: '+esc(dateLabel(g.date))+'</h2><p class="muted">Rendelési határidő ma '+esc(g.cutoff)+'</p>'+g.routes.map(r=>{const pending=sorted(r.pending),skipped=sorted(r.skipped);return '<section class="section-gap"><h3>'+esc(r.name)+' · Még nem válaszolt ('+pending.length+')</h3><div class="order-grid section-gap">'+(pending.length?pending.map(card).join(''):'<p class="card">Minden partner válaszolt ezen a túrán.</p>')+'</div>'+(skipped.length?'<details class="card section-gap"><summary>Most nem kér szállítást ('+skipped.length+')</summary>'+skipped.map(p=>'<p>✓ '+esc(p.name)+'</p>').join('')+'</details>':'')+'</section>';}).join('')+'</section>').join(''):'<div class="card empty section-gap">Mára nincs beosztott partner rendelési határidővel. Másik kiszállítási napot fent választhatsz.</div>');
}

function staffNews() {
  return heading("KOMMUNIKÁCIÓ","Hírek és akciók","A megjelent híreket minden partner láthatja; push azoknak készül, akik kérték.")+
    '<div class="grid equal-col"><section class="card"><h2>Új közlemény</h2><form id="publish-news" class="section-gap"><div class="field"><label for="news-kind">Típus</label><select id="news-kind" name="kind"><option>Hír</option><option>Akció</option><option>Tájékoztató</option></select></div><div class="field"><label for="news-title">Cím</label><input id="news-title" name="title" maxlength="140" placeholder="Például: Akciós az 1 kg-os gyros" required></div><div class="field"><label for="news-body">Szöveg</label><textarea id="news-body" name="body" rows="7" maxlength="4000" placeholder="Írd le az ajánlatot, az árat, az érvényességet és a feltételeket." required></textarea></div><p class="notice">'+data.subscribedPartners+' partner kért hírekről értesítést. A küldés a háttérfolyamat működésétől függ.</p><button class="button primary">Közzététel →</button></form></section><div class="news-list">'+data.news.map(newsCard).join("")+'</div></div>';
}
const expandedAccountLists=new Set();
const accountNameOrder=new Intl.Collator('hu',{sensitivity:'base',numeric:true});
function accountList(items,key,label,row,limit=5,moreLabel='Továbbiak'){
 const sorted=[...items].sort((a,b)=>accountNameOrder.compare(label(a),label(b))||accountNameOrder.compare(a.username||'',b.username||'')||String(a.id).localeCompare(String(b.id)));
 const expanded=expandedAccountLists.has(key),remaining=sorted.length-limit;
 return sorted.slice(0,limit).map(row).join('')+(remaining>0?'<div id="'+key+'-more" class="stack"'+(expanded?'':' hidden')+'>'+sorted.slice(limit).map(row).join('')+'</div><button type="button" class="button secondary section-gap" data-action="more-accounts" data-list="'+key+'" data-count="'+remaining+'" data-more-label="'+esc(moreLabel)+'" aria-controls="'+key+'-more" aria-expanded="'+expanded+'">'+(expanded?'Kevesebb':esc(moreLabel)+' ('+remaining+')')+'</button>':'');
}
function staffAccess() {
 const labels={pending:'Elfogadásra vár',sending:'Küldés folyamatban',accepted:'Elfogadva',expired:'Lejárt',revoked:'Visszavonva',failed:'Sikertelen küldés'};
 return '<section class="card section-gap"><h2>Céges munkatársak meghívása</h2><p class="muted">A meghívott teljes céges hozzáférést kap: rendeléseket, partnereket, híreket és meghívásokat kezelhet.</p><form id="invite-staff" class="section-gap"><label for="staff-email">Munkatárs e-mail-címe</label><input id="staff-email" name="email" type="email" required maxlength="254" autocomplete="off"><p class="small muted">24 óráig érvényes linket kap, ahol saját felhasználónevet és legalább 8 karakteres jelszót állíthat be.</p><button class="button primary">Meghívó küldése e-mailben</button></form><h3 class="section-gap">Céges fiókok</h3>'+accountList(data.staffAccounts,'staff-accounts',u=>u.username,u=>'<p><strong>'+esc(u.username)+'</strong> · '+esc(u.email||'Nincs e-mail-cím')+' <span class="badge gray">'+(u.emailVerified?'E-mail igazolva':'Külön létrehozott fiók')+'</span></p>')+'<h3 class="section-gap">Meghívások</h3><div class="stack">'+(data.invitations.length?data.invitations.map(i=>'<div class="total-line"><div><strong>'+esc(i.email)+'</strong><p>'+esc(labels[i.status])+' · Lejárat: '+esc(new Date(i.expires).toLocaleString('hu-HU',{timeZone:'Europe/Budapest'}))+'</p></div>'+(['pending','sending'].includes(i.status)?'<button class="button secondary" data-action="revoke-invitation" data-id="'+esc(i.id)+'">Visszavonás</button>':'')+'</div>').join(''):'<p class="muted">Még nincs meghívás.</p>')+'</div></section>';
}
function staffSettings() {
  const days=["Vasárnap","Hétfő","Kedd","Szerda","Csütörtök","Péntek","Szombat"];
  return heading("BEÁLLÍTÁSOK","Túrák és partnerek","Határidő 14:00-kor az előző napon; hétfői kiszállításnál pénteken. Emlékeztető előző este 17:00-kor és a határidő napján 10:00-kor.")+
    '<details id="route-settings" class="card section-gap" '+(routeSettingsOpen?'open':'')+'><summary>Túrák szerkesztése ('+data.routes.length+')</summary><p class="muted small">Itt módosíthatod a túrák elnevezését.</p><div class="grid equal-col section-gap">'+data.routes.map(r=>'<section class="card"><h2>'+esc(days[r.fixedDay]||r.name)+'</h2><form data-route-form="'+esc(r.id)+'"><label for="route-name-'+esc(r.id)+'">Túra neve</label><input id="route-name-'+esc(r.id)+'" name="name" maxlength="100" value="'+esc(r.name)+'" required><input type="hidden" name="days" value="'+r.fixedDay+'"><p class="small muted section-gap">Emlékeztetők: a rendelési nap előtti este 17:00 és a rendelési napon 10:00. Határidő: 14:00; hétfői kiszállításhoz pénteken.</p><input type="hidden" name="reminder" value="10:00"><input type="hidden" name="cutoff" value="14:00"><button class="button primary">Túra mentése</button></form></section>').join("")+'</div></details>'+
    '<section class="card section-gap"><h2>Partnerek kiszállítási napjai</h2>'+accountList(data.allPartners,'partner-delivery-days',p=>p.name,p=>'<form id="partner-days-'+esc(p.id)+'" data-partner-days="'+esc(p.id)+'" class="partner-days"><h3>'+esc(p.name)+'</h3><div class="route-checks">'+data.routes.map(r=>'<label class="check-line"><input type="checkbox" name="routeIds" value="'+esc(r.id)+'" '+((p.routeIds||[p.routeId]).includes(r.id)?'checked':'')+'>'+esc(r.name)+'</label>').join('')+'</div><button class="button primary">Kiszállítási napok mentése</button></form>',3,'További partnerek')+'</section>'+staffAccess()+accountControls()+sessionSettings();
}
function applications() {
  const pending=data.applications.filter(u=>u.status==='pending');
  return heading('PARTNERHOZZÁFÉRÉSEK','Regisztrációk',pending.length+' kérelem vár elbírálásra. Jóváhagyáskor jelöld ki a partner kiszállítási napjait.')+
    '<div class="stack">'+(pending.length?pending.map(u=>'<section class="card"><span class="badge amber">Jóváhagyásra vár</span><h2>'+esc(u.company)+'</h2><p>'+esc(u.contact)+' · '+esc(u.phone)+'</p><p>'+esc(u.address)+'</p><p class="muted">Felhasználónév: '+esc(u.username)+'</p><form id="application-'+esc(u.id)+'" data-application="'+esc(u.id)+'" class="section-gap"><p>Kiszállítási napok (legalább egy)</p><div class="route-checks">'+data.routes.map(r=>'<label class="check-line"><input type="checkbox" name="routeIds" value="'+esc(r.id)+'">'+esc(r.name)+'</label>').join('')+'</div><div class="button-row"><button class="button primary">Hozzáférés jóváhagyása</button><button type="button" class="button secondary" data-action="reject-application" data-id="'+esc(u.id)+'">Elutasítás</button></div></form></section>').join(''):'<div class="card empty">Nincs jóváhagyásra váró regisztráció.</div>')+'</div><section class="card section-gap"><h2>Elbírált kérelmek</h2>'+data.applications.filter(u=>u.status!=='pending').map(u=>'<p>'+esc(u.company)+' · '+esc(u.username)+' — '+(u.status==='approved'?'Jóváhagyva':'Elutasítva')+'</p>').join('')+'</section>';
}
function accountControls(){
 return '<section class="card section-gap"><h2>Fiókok hozzáférése</h2><p>A letiltás megszünteti a belépéseket és az eszközértesítéseket. A korábbi rendelések megmaradnak.</p><div class="stack">'+accountList(data.accounts||[],'access-accounts',u=>u.company||u.username,u=>'<div class="saved-list"><div><strong>'+esc(u.company||u.username)+'</strong><p>'+esc(u.username)+' · '+(u.role==='staff'?'Munkatárs':'Partner')+' · '+(u.status==='disabled'?'Letiltva':'Aktív')+'</p></div>'+(u.id!==data.currentUserId?'<button class="button secondary" data-action="account-status" data-id="'+esc(u.id)+'">'+(u.status==='disabled'?'Visszaengedés':'Letiltás')+'</button>':'<span>Saját fiók</span>')+'</div>')+'</div></section>';
}
function operationTime(value){return new Date(value).toLocaleString('hu-HU',{timeZone:'Europe/Budapest'});}
function operationsPanel(){
 const o=data.operations||{},names={products:'Termék',routes:'Túra',partners:'Partnerbeosztás',responses:'Rendelés',news:'Hír',users:'Fiók',staffInvitations:'Meghívás'};
 return '<section class="card section-gap"><h2>Háttérfolyamatok</h2><p>Utolsó ellenőrzés: '+esc(o.lastTick?operationTime(o.lastTick):'Még nem futott')+'</p><p>Utolsó adatmentés: '+esc(o.backupAt?operationTime(o.backupAt):'Még nincs sikeres mentés')+'</p><p>Push: '+(o.pushMode==='live'?'Távoli küldés bekapcsolva':'Helyi szimuláció')+'</p>'+(o.lastError?'<p class="notice">'+esc(o.lastError)+'</p>':'')+'</section><section class="card section-gap"><h2>Munkatársi eseménynapló</h2><p>Az utolsó 100 módosítás, legfrissebb elöl.</p>'+(data.auditLog||[]).map(e=>'<details><summary>'+esc(operationTime(e.at))+' · '+esc(e.actorName)+' · '+esc(e.changes.map(c=>names[c.collection]||c.collection).join(', '))+'</summary>'+e.changes.map(c=>'<p>'+esc(names[c.collection]||c.collection)+' #'+esc(c.id)+'</p><pre class="audit-diff">'+esc(JSON.stringify({előtte:c.before,utána:c.after},null,2))+'</pre>').join('')+'</details>').join('')+(!(data.auditLog||[]).length?'<p>Még nincs naplózott módosítás.</p>':'')+'</section>';
}
function notifications() {
  return heading("ÉRTESÍTÉSI KÖZPONT","Küldési napló","Itt követheted az elkészített értesítéseket és a küldési módot.",'<button class="button secondary" data-action="reminders">Emlékeztetők ellenőrzése</button>')+
    '<section class="card section-gap"><h2>Admin értesítések ezen az eszközön</h2><p>Új rendelésről, bejelentésről és regisztrációról értesítést kaphatsz. iPhone-on előbb add az adminfelületet a főképernyőhöz, és onnan nyisd meg.</p><div class="settings-actions"><button class="button primary" data-action="staff-enable-push">Admin értesítések bekapcsolása</button><button class="button secondary" data-action="staff-disable-push">Értesítések kikapcsolása ezen az eszközön</button></div><p class="small muted">A háttérben küldés állapotát lent ellenőrizheted.</p></section>'+
    '<p class="notice">A még nem válaszoló partnerek a rendelési nap előtti este 17:00-kor és a rendelési napon 10:00-kor kapnak emlékeztetőt. Hétfői kiszállításnál a rendelési nap péntek. A kézbesítés a háttérfolyamat és az eszköz működésétől függ.</p>'+
    retentionPanel()+operationsPanel()+'<div class="card table-wrap"><table><thead><tr><th>Partner</th><th>Értesítés</th><th>Időpont</th><th>Állapot</th></tr></thead><tbody>'+data.outbox.map(n=>'<tr><td>'+esc(n.staffUserId ? 'Céges munkatárs' : data.allPartners.find(p=>p.id===n.partnerId)?.name)+'</td><td><strong>'+esc(n.title)+'</strong>'+esc(n.body)+'</td><td>'+esc(dateShort(n.createdAt))+'</td><td><span class="badge amber">'+esc(({simulation:'Helyi próba',pending:'Küldésre vár',complete:'Küldési kísérletek lezárva',cancelled:'Visszavonva',no_devices:'Nincs feliratkozott eszköz'})[n.status]||n.status)+' </span></td></tr>').join("")+'</tbody></table>'+(!data.outbox.length?'<div class="empty">Még nem készült értesítés.</div>':'')+'</div>';
}
function render() {
  const tab=currentTab();
  document.querySelectorAll("[data-nav]").forEach(a=>{a.classList.toggle("active",a.dataset.nav===tab);if(a.dataset.nav===tab)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  if(role==='staff'){
    const more=document.getElementById('mobile-more'),summary=more?.querySelector('summary');
    const complaints=(data.allPartners||[]).reduce((count,p)=>count+(p.complaints||[]).filter(c=>c.status==='open').length,0),applications=data.todo?.pending||0,total=complaints+applications;
    if(summary){summary.classList.toggle('active',!['dashboard','packing','calls'].includes(tab));summary.setAttribute('aria-label','További menüpontok'+(total?' · '+complaints+' nyitott bejelentés, '+applications+' várakozó regisztráció':''));}
    for(const [id,count] of [['mobile-more-count',total],['mobile-complaints-count',complaints],['mobile-applications-count',applications]]){const badge=document.getElementById(id);if(badge){badge.hidden=count===0;badge.textContent=count>99?'99+':String(count);}}
  }
  if(role==="staff") content.innerHTML=({dashboard:staffDashboard,packing:staffPacking,complaints:staffComplaints,products:staffProducts,news:staffNews,settings:staffSettings,notifications,applications,calls}[tab])();
  else content.innerHTML=({home,order,history,reports:partnerReports,settings:partnerSettings,news:()=>heading("HÍREK ÉS AJÁNLATOK","Frissen a Kebprótól","Akciók, újdonságok és fontos tudnivalók.",'<button class="button secondary" data-action="refresh">Frissítés</button>')+'<div class="news-list">'+data.news.map(newsCard).join("")+'</div>'}[tab])();
 if(role==='partner'){content.insertAdjacentHTML('afterbegin','<section id="draft-status" class="notice warning" aria-live="polite" hidden></section>');saveDraft();}
}
function confirm(title,html,action) {
  document.getElementById("confirm-title").textContent=title;
  document.getElementById("confirm-content").innerHTML=html;
  document.getElementById("confirm-error").textContent="";
  confirmAction=action;
  document.getElementById("confirm-dialog").showModal();
}
document.getElementById("cancel-confirm").addEventListener("click",()=>document.getElementById("confirm-dialog").close());
document.getElementById("submit-confirm").addEventListener("click",async event=>{
  event.target.disabled=true;
  document.getElementById("cancel-confirm").disabled=true;
  try { await confirmAction(); document.getElementById("confirm-dialog").close(); }
  catch(err){document.getElementById("confirm-error").textContent=err.message;}
  finally {event.target.disabled=false;document.getElementById("cancel-confirm").disabled=false;}
});
async function registration() {
  if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)) throw new Error("Ez a böngésző most nem támogatja a push értesítést. iPhone-on a főképernyőre telepített appból próbáld.");
  return navigator.serviceWorker.ready;
}
function keyBytes(value) {
  const raw=atob(value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
content.addEventListener("input",event=>{
 if(event.target.id==='price-product-search'){productSearch=event.target.value;for(const card of content.querySelectorAll('[data-price-card]'))card.hidden=!searchMatch(card.dataset.priceCard,productSearch);return;}
 if(event.target.id==='price-partner-search'){partnerSearch=event.target.value;filterPricePartners();return;}
 if(event.target.dataset.cartQuantity!==undefined){cart[Number(event.target.dataset.cartQuantity)].quantity=Number(event.target.value);requestId=crypto.randomUUID();}
 if(event.target.id==='order-note'){note=event.target.value;requestId=crypto.randomUUID();}
 if(event.target.dataset.cartQuantity!==undefined){const i=Number(event.target.dataset.cartQuantity),line=content.querySelector('[data-line-price="'+i+'"]'),total=document.getElementById('cart-total');if(line)line.textContent=money(currentPrice(cart[i]))+' / '+cart[i].unit+' · '+money(currentLine(cart[i]));if(total)total.textContent=cartSummary();}
 if(event.target.dataset.cartQuantity!==undefined||event.target.id==='order-note')saveDraft();
 if(event.target.id==='order-search'){orderSearch=event.target.value;ordersPage=1;loadSequence++;clearTimeout(searchTimer);searchTimer=setTimeout(()=>load().catch(e=>toast(e.message)),350);}
 else if(event.target.form && event.target.form.id!=='filters')event.target.form.dataset.dirty='true';
});
content.addEventListener("submit",async event=>{
  event.preventDefault();
  const form=event.target, values=new FormData(form), button=event.submitter;
  if(button)button.disabled=true;
  try {
    if(form.dataset.complaintOrder||form.dataset.generalReport){const orderId=form.dataset.complaintOrder,key=orderId||'general';complaintRequests[key] ||= crypto.randomUUID();const photo=await compressComplaintPhoto(values.get('photo'));const labelPhoto=orderId?await compressComplaintPhoto(values.get('labelPhoto')):null;await api('complaints',{orderId,kind:orderId?'complaint':'general',message:values.get('message'),requestId:complaintRequests[key],photo,labelPhoto});delete complaintRequests[key];await load();toast('Bejelentés elküldve.');
    }else if(form.dataset.complaintReply){await api('complaints',{id:form.dataset.complaintReply,reply:values.get('reply'),status:values.get('status'),expectedRevision:Number(form.dataset.revision)});await load();toast('Válasz és állapot mentve.');
    }else if(form.dataset.promotionProduct){const kind=values.get('kind'),raw=String(values.get('value')).trim();if(kind!=='none'&&raw==='')throw Error('Add meg az akció értékét.');await api('promotions',{productId:form.dataset.promotionProduct,unit:values.get('unit'),kind,value:kind==='none'?null:Number(raw)});await load();toast('Általános akció elmentve.');
    }else if(form.dataset.priceProduct){const raw=String(values.get('price')).trim();await api('prices',{productId:form.dataset.priceProduct,partnerId:values.get('partnerId')||null,unit:values.get('unit'),price:raw===''?null:Number(raw)});await load();toast('Ár elmentve.');
    }else if(form.dataset.partnerDays){await api('partners',{id:form.dataset.partnerDays,routeIds:values.getAll('routeIds')});toast('Kiszállítási napok mentve.');await load();
    }else if(form.id==="invite-staff"){
      const email=values.get('email');
      confirm('Céges munkatárs meghívása','<p>A meghívót erre a címre küldjük: <strong>'+esc(email)+'</strong>.</p><p>A meghívott teljes céges hozzáférést kap. A link 24 óráig érvényes.</p>',async()=>{await api('invitations',{email});await load();toast('A meghívót átadtuk a levelezőszervernek.');});
    } else if(form.dataset.application){
      const result=await api("applications",{id:form.dataset.application,status:"approved",routeIds:values.getAll("routeIds")});await load();toast(result.emailSent?'Partner jóváhagyva; az értesítést átadtuk a levelezőszervernek.':'Partner jóváhagyva, de az értesítő e-mail küldése sikertelen. Értesítsd a partnert más módon.');
    } else if(form.id==="add-product"){
      const product=data.products.find(p=>p.id===values.get("productId")), amount=Number(values.get("quantity")), unit=values.get("unit");
      if(!product||!Number.isFinite(amount)||amount<=0||amount>10000|| (unit!=="kg"&&!Number.isInteger(amount)))throw new Error("Ellenőrizd a terméket és a mennyiséget. Darab és karton csak egész szám lehet.");
      const existing=cart.find(i=>i.productId===product.id);
      if(existing){if(existing.unit!==unit)throw new Error("Ez a termék már szerepel más mértékegységgel. Előbb távolítsd el.");if(existing.quantity+amount>10000)throw new Error("Túl nagy mennyiség.");existing.quantity=Math.round((existing.quantity+amount)*100)/100;}
      else cart.push({productId:product.id,name:product.name,quantity:amount,unit});
      requestId=crypto.randomUUID();render();
    } else if(form.id==="preferences"){
      await api("preferences",{reminders:values.has("reminders"),news:values.has("news")});toast("Beállítások elmentve.");await load();
    } else if(form.id==="filters"){
      selectedDate=values.get("date");selectedRoute=values.get("route");await load();
    } else if(form.id==="publish-news"){
      await api("news",{title:values.get("title"),body:values.get("body"),kind:values.get("kind"),requestId:newsRequestId});
      newsRequestId=crypto.randomUUID();toast("A hír megjelent a helyi partnerfelületen.");await load();
    } else if(form.dataset.routeForm){
      await api("routes",{id:form.dataset.routeForm,name:values.get("name"),days:values.getAll("days").map(Number),reminder:values.get("reminder"),cutoff:values.get("cutoff")});
      toast("Túra beállításai elmentve.");await load();
    }
  }catch(err){toast(err.message);}finally{if(button)button.disabled=false;}
});
content.addEventListener('toggle',event=>{if(event.target.id==='route-settings')routeSettingsOpen=event.target.open;},true);
content.addEventListener("change",async event=>{
 if(event.target.id==='price-partner-filter'){if(content.querySelector('form[data-price-product][data-dirty="true"]')){event.target.value=pricePartner;toast('Előbb mentsd az elkezdett ármódosítást.');return;}pricePartner=event.target.value;render();return;}
 if(event.target.matches('[data-price-partner],[data-price-unit]')){event.target.form.dataset.dirty='true';fillPriceForm(event.target.form);return;}
 if(event.target.id==='order-delivery'){const date=event.target.value;const change=()=>{orderDate=date;cart=[];note='';editing=null;requestId=crypto.randomUUID();render();};if(cart.length||note||editing){event.target.value=orderDate;confirm('Másik kiszállítás kiválasztása','<p>A kosár nem mentett változtatásai elvesznek. Folytatod?</p>',change);}else change();return;}
  if(event.target.id==='archive-sort'){archiveSort=event.target.value;ordersPage=1;await load();return;}
  if(event.target.id==='archive-date'){archiveDate=event.target.value;ordersPage=1;await load();return;}
  if(event.target.closest('#filters')){
    const form=event.target.form;if(!form.reportValidity())return;selectedDate=form.elements.date.value;selectedRoute=form.elements.route.value;try{await load();}catch(err){toast(err.message);}return;
  }
  if(event.target.form && event.target.form.id!=='filters')event.target.form.dataset.dirty='true';
  if(event.target.matches('select[id^="partner-route-"]'))event.target.dataset.dirty='true';

});
content.addEventListener("click",async event=>{
  const button=event.target.closest("[data-action]");if(!button)return;
  if(button.dataset.action==='view-photo'){openComplaintPhoto(button.dataset.photoId,button.dataset.photoLabel);return;}
  const action=button.dataset.action;
  if(action==='more-accounts'){
    const key=button.dataset.list,expanded=!expandedAccountLists.has(key);
    if(expanded)expandedAccountLists.add(key);else expandedAccountLists.delete(key);
    document.getElementById(key+'-more').hidden=!expanded;
    button.setAttribute('aria-expanded',String(expanded));
    button.textContent=expanded?'Kevesebb':button.dataset.moreLabel+' ('+button.dataset.count+')';
    return;
  }
  try{
    if(action==='page'){if(button.dataset.kind==='history')historyPage=Number(button.dataset.page);else ordersPage=Number(button.dataset.page);await load();window.scrollTo(0,0);}
    if(action==='todo-new'){orderView='new';ordersPage=1;orderSearch='';await load();}
    if(action==='todo-calls'){callMode='today';location.hash='calls';render();}
    if(action==='calls-mode'){callMode=button.dataset.mode==='manual'?'manual':'today';render();}
    if(action==='product-availability'){button.disabled=true;try{await api('products',{id:button.dataset.id,active:button.dataset.active==='true'});await load();toast('Termék elérhetősége mentve.');}finally{button.disabled=false;}}

    if(action==='account-status'){
 const u=data.accounts.find(u=>u.id===button.dataset.id),status=u.status==='disabled'?'approved':'disabled';
 confirm(status==='disabled'?'Fiók letiltása':'Hozzáférés visszaállítása','<p>'+esc(u.company||u.username)+'</p><p>'+(status==='disabled'?'A felhasználó kijelentkezik, és nem léphet be.':'A felhasználó ismét beléphet. Az értesítéseket újra engedélyeznie kell.')+'</p>',async()=>{await api('accounts',{id:u.id,status});await load();toast('Hozzáférés módosítva.');});
 }
 if(action==='extend-session')openSessionRenewal();
 if(action==='discard-draft')confirm('Piszkozat törlése','<p>A nem beküldött kosár és megjegyzés törlődik ezen az eszközön. A már leadott rendelések megmaradnak.</p>',()=>{cart=[];note='';editing=null;requestId=crypto.randomUUID();render();});
    if(action==='edit-order'){const response=[...data.history,...(data.currentResponses||[])].find(r=>r.id===button.dataset.id);if(!response?.canEdit)throw new Error('A határidő lejárt.');if(cart.length)confirm('Rendelés módosítása','<p>A jelenlegi kosár helyére a kiválasztott rendelés kerül.</p>',()=>startEdit(response));else startEdit(response);}
    if(action==='cancel-edit'){editing=null;cart=[];note='';render();}
    if(action==='save-template'){
      confirm('Szokásos rendelési lista mentése','<label>Lista neve<input id="template-name" maxlength="80" value="Szokásos rendelésem"></label><label>Mentés ide<select id="template-target"><option value="">Új lista</option>'+data.templates.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+' felülírása</option>').join('')+'</select></label>',async()=>{await api('templates',{id:document.getElementById('template-target').value||undefined,name:document.getElementById('template-name').value,items:cart});await load();toast('Rendelési lista mentve.');});
    }
    if(action==='load-template'){
      if(currentResponse()&&!editing)throw new Error('Erre a napra már válaszoltál. Előbb nyisd meg a rendelés módosítását.');const template=data.templates.find(t=>t.id===button.dataset.id);const use=()=>{cart=template.items.filter(i=>data.products.some(p=>p.id===i.productId)).map(i=>({...i}));requestId=crypto.randomUUID();render();toast(cart.length<template.items.length?'Lista betöltve; a már nem rendelhető termékeket kihagytuk. Ellenőrizd a kosarat.':'Lista betöltve. Ellenőrizd a tételeket; még nem adtál le rendelést.');};
      if(cart.length)confirm('Kosár cseréje','<p>A kosár helyére a mentett lista kerül.</p>',use);else use();
    }
    if(action==='delete-template')confirm('Mentett lista törlése','<p>A korábbi rendeléseid megmaradnak.</p>',async()=>{await api('templates',{id:button.dataset.id,remove:true});await load();});
    if(action==='order-view'){orderView=button.dataset.view;orderSearch='';ordersPage=1;await load();}
    if(action==='clear-archive-date'){archiveDate='';ordersPage=1;await load();}
    if(action==='archive-order'||action==='restore-order'){
      button.disabled=true;
      try{await api('archive',{id:button.dataset.id,archived:action==='archive-order',revision:(data.allOrders.find(r=>r.id===button.dataset.id)?.revision||1)});await load();toast(action==='archive-order'?'Rendelés archiválva. Az Archívumból visszaállítható.':'Rendelés visszaállítva az újak közé.');}finally{button.disabled=false;}
    }
    if(action==='tomorrow'){const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest'}).format(new Date());const tomorrow=new Date(today+'T12:00:00Z');tomorrow.setUTCDate(tomorrow.getUTCDate()+1);selectedDate=tomorrow.toISOString().slice(0,10);selectedRoute='';await load();}
    if(action==="revoke-invitation")confirm('Meghívó visszavonása','<p>A kiküldött linkkel ezután már nem hozható létre céges fiók.</p>',async()=>{await api('revoke-invitation',{id:button.dataset.id});await load();toast('Meghívó visszavonva.');});
    if(action==="choose-product")openProductPicker();
    if(action==="reject-application")confirm('Regisztráció elutasítása','<p>A partner nem kap hozzáférést. Biztosan elutasítod a kérelmet?</p>',async()=>{await api('applications',{id:button.dataset.id,status:'rejected'});await load();toast('Kérelem elutasítva.');});
    if(action==="remove-item"){cart.splice(Number(button.dataset.index),1);requestId=crypto.randomUUID();render();}
    if(action==="review"){
      const unavailable=cart.filter(i=>!data.products.some(p=>p.id===i.productId));if(unavailable.length)throw Error('Ezek most nem rendelhetők: '+unavailable.map(i=>i.name).join(', ')+'. Távolítsd el őket a kosárból.');
      const expectedPrices=cart.map(currentPrice);if(expectedPrices.some(p=>p===null))throw new Error('Az egyik termékhez nincs megadva ár. Kérjük, fordulj az értékesítő kollégákhoz az ár beállításához.');
      confirm("Ellenőrizd a rendelésed",'<p class="muted">Kiszállítás: '+esc(dateLabel(chosenDelivery().date))+'</p><ul class="history-items">'+cart.map(i=>'<li>'+esc(i.name)+' · '+quantity(i.quantity)+' '+esc(i.unit)+' · '+esc(money(currentPrice(i)))+' / '+esc(i.unit)+' · '+esc(money(currentLine(i)))+'</li>').join("")+'</ul><p><strong>'+esc(cartSummary())+'</strong></p>'+(note?'<p class="section-gap">'+esc(note)+'</p>':""),
        async()=>{historyPage=1;const result=await api("responses",{kind:"order",date:chosenDelivery().date,items:cart,expectedPrices,note,requestId,responseId:editing?.id,revision:editing?.revision});cart=[];note="";editing=null;requestId=crypto.randomUUID();saveDraft();await load();location.hash="history";toast("Rendelés rögzítve: "+result.response.id.slice(0,8).toUpperCase());});
    }
    if(action==="skip"){
      if(currentTab()==='home'&&(cart.length||note||editing)){location.hash='order';toast('Előbb fejezd be vagy töröld a meglévő piszkozatot.');return;}
      if(currentTab()==='home'){orderDate=data.nextDelivery.date;editing=null;}
      confirm("Most nem kérsz szállítást?",'<p>'+esc(dateLabel(chosenDelivery().date))+' napjára rögzítjük, hogy nem kérsz árut. Így a munkatársaknak nem kell telefonon rákérdezniük.</p>',
        async()=>{await api("responses",{kind:"skip",date:chosenDelivery().date,requestId,responseId:editing?.id,revision:editing?.revision});editing=null;cart=[];note="";requestId=crypto.randomUUID();saveDraft();await load();location.hash="history";toast("Válaszod rögzítettük.");});
    }
    if(action==="repeat"){
      if(currentResponse()||!chosenDelivery().open)throw new Error("A következő kiszállításra most nem adhatsz le új rendelést.");
      const old=data.history.find(r=>r.id===button.dataset.id);
      cart=old.items.filter(i=>data.products.some(p=>p.id===i.productId)).map(i=>({...i}));
      requestId=crypto.randomUUID();location.hash="order";render();toast("A korábbi tételeket betöltöttük. Ellenőrizd a mennyiségeket beküldés előtt.");
    }
    if(action==="refresh")await load();
    if(action==="print")window.print();
    if(action==="save-partner"){await api("partners",{id:button.dataset.id,routeId:document.getElementById("partner-route-"+button.dataset.id).value});toast("Túrabeosztás elmentve.");await load();}
    if(action==="reminders"){const result=await api("reminders",{});await load();toast(result.created+" új emlékeztető került a naplóba.");}
    if(action==="enable-push"){await enablePartnerPush();}
    if(action==="staff-enable-push"){
      if(!('Notification' in window)||!('PushManager' in window)||!('serviceWorker' in navigator))throw Error('iPhone-on előbb add a főképernyőhöz és onnan nyisd meg az adminfelületet.');
      const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Az értesítéseket nem engedélyezted.');
      const reg=await registration();const subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(data.publicKey)});
      const result=await api('subscription',subscription.toJSON());toast(result.mode==='live'?'Rendelési értesítések bekapcsolva.':'Az eszköz feliratkozott; a távoli küldés még nem aktív.');await load();
    }
    if(action==="staff-disable-push"){
      const reg=await registration(),subscription=await reg.pushManager.getSubscription();if(subscription){await api('subscription',{endpoint:subscription.endpoint},'DELETE');await subscription.unsubscribe();}toast('Az eszköz leiratkozott.');await load();
    }
    if(action==="disable-push"){
      const reg=await registration(), subscription=await reg.pushManager.getSubscription();
      if(subscription){await api("subscription",{endpoint:subscription.endpoint},"DELETE");await subscription.unsubscribe();}
      toast("Ez az eszköz leiratkozott.");await load();
    }
    if(action==="test-push"){
      const reg=await registration();
      if(Notification.permission!=="granted")throw new Error("Előbb engedélyezd az értesítéseket.");
      await reg.showNotification("Kebpro · Helyi próba",{body:"Így jelenhet meg a rendelési emlékeztetőd. Ez csak ezen az eszközön indított teszt.",icon:"/partner/assets/partner-v2-192.png",data:{url:"/partner/"}});
      toast("Helyi próbaértesítés megjelenítve.");
    }
  }catch(err){toast(err.message);}
});
document.getElementById("logout").addEventListener("click",async()=>{
  try{
    let endpoint;
    if("serviceWorker" in navigator){
      const reg=await navigator.serviceWorker.getRegistration(role === 'partner' ? '/partner/' : '/partner-admin/');
      const subscription=await reg?.pushManager?.getSubscription();
      if(subscription){endpoint=subscription.endpoint;await subscription.unsubscribe();}
    }
    await api("logout",{endpoint});location.href=base+"/login";
  }catch(err){toast(err.message);}
});
if(role==='staff'){
 const more=document.getElementById('mobile-more');
 more?.addEventListener('click',event=>{if(event.target.closest('a'))more.open=false;});
 document.addEventListener('click',event=>{if(more?.open&&!more.contains(event.target))more.open=false;});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&more?.open){more.open=false;more.querySelector('summary')?.focus();}});
 window.addEventListener('hashchange',()=>{if(more)more.open=false;});
}
window.addEventListener("hashchange",()=>{if(data){if(role==='partner'&&['home','order'].includes(currentTab())&&historyPage!==1){historyPage=1;load().catch(e=>toast(e.message));}else render();window.scrollTo(0,0);}});
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstall=event;document.getElementById("install-app").hidden=false;});
document.getElementById("install-app").addEventListener("click",async()=>{if(deferredInstall){await deferredInstall.prompt();deferredInstall=null;document.getElementById("install-app").hidden=true;}});
if("serviceWorker" in navigator)navigator.serviceWorker.register(base+"/sw.js",{scope:base+"/"}).catch(()=>toast("A telepíthető mód nem indult el; az oldal böngészőből használható."));
load().catch(err=>{content.innerHTML='<div class="notice warning">'+esc(err.message)+'</div><button class="button secondary" id="retry-load">Újrapróbálom</button>';document.getElementById("retry-load").addEventListener("click",()=>location.reload());});

function openProductPicker() {
 const dialog=document.createElement('dialog');dialog.className='product-picker';dialog.setAttribute('aria-labelledby','picker-title');
 dialog.innerHTML='<div class="card-header"><h2 id="picker-title">Válassz terméket</h2><button class="button secondary" type="button" id="close-picker" aria-label="Termékválasztó bezárása">Bezárás</button></div><label for="product-search">Keresés a termékek között</label><input id="product-search" type="search" placeholder="Például: csirke" autocomplete="off"><p id="product-count" class="muted small" role="status"></p><div id="product-options" class="product-options"></div>';
 document.body.append(dialog);
 const list=dialog.querySelector('#product-options'), search=dialog.querySelector('input');
 const draw=()=>{const results=[...data.products].sort((a,b)=>Number((data.favoriteProductIds||[]).includes(b.id))-Number((data.favoriteProductIds||[]).includes(a.id))).filter(p=>p.name.toLocaleLowerCase('hu').includes(search.value.trim().toLocaleLowerCase('hu')));dialog.querySelector('#product-count').textContent=results.length+' termék';list.innerHTML=results.map(p=>'<div class="product-choice"><button type="button" data-product="'+esc(p.id)+'">'+esc(p.name)+'<span aria-hidden="true">＋</span></button><button type="button" data-favorite="'+esc(p.id)+'" aria-label="'+esc(p.name)+' kedvenc" aria-pressed="'+(data.favoriteProductIds||[]).includes(p.id)+'">'+((data.favoriteProductIds||[]).includes(p.id)?'★':'☆')+'</button></div>').join('')||'<p>Nincs ilyen termék. Próbálj másik keresést.</p>';};
 search.addEventListener('input',draw);
 list.addEventListener('click',async event=>{const favorite=event.target.closest('[data-favorite]');if(favorite){favorite.disabled=true;try{const productId=favorite.dataset.favorite;const active=!(data.favoriteProductIds||[]).includes(productId);await api('favorites',{productId,favorite:active});data.favoriteProductIds=(data.favoriteProductIds||[]).filter(id=>id!==productId);if(active)data.favoriteProductIds.push(productId);draw();}catch(error){toast(error.message);favorite.disabled=false;}return;}const b=event.target.closest('[data-product]');if(!b)return;document.getElementById('product').value=b.dataset.product;document.getElementById('add-product').dataset.dirty='true';document.getElementById('product-label').textContent=data.products.find(p=>p.id===b.dataset.product).name;dialog.close();document.getElementById('quantity').focus();});
 dialog.querySelector('#close-picker').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());draw();dialog.showModal();
}

setInterval(()=>load(true),5000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)load(true);});
window.addEventListener("online",()=>load(true));


let pushOfferShown=false;
function pushSetupKey(){return 'kebpro-push-intro-v1:'+data.id;}
function rememberPushOffer(){try{localStorage.setItem(pushSetupKey(),'seen');}catch{}}
async function enablePartnerPush(){
 if(!('Notification' in window)||!('PushManager' in window)||!('serviceWorker' in navigator))throw new Error('Ezen a böngészőn nem érhető el. iPhone-on előbb add a Főképernyőhöz, majd onnan nyisd meg az appot.');
 // Called directly by a click handler, before any await, to preserve user activation.
 const permission=await Notification.requestPermission();
 if(permission!=='granted')throw new Error('Az értesítéseket nem engedélyezted. A böngésző vagy a telefon beállításaiban később bekapcsolhatod.');
 const reg=await registration();
 const subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(data.publicKey)});
 const result=await api('subscription',{...subscription.toJSON(),enableNews:true});rememberPushOffer();
 toast(result.mode==='live'?'Értesítések és hírek bekapcsolva. A hírek a Beállításokban kikapcsolhatók.':'Értesítések és hírek beállítva. A távoli küldés jelenleg nem aktív.');
 await load();
}
function offerPushSetup(){
 if(role!=='partner'||pushOfferShown||document.querySelector('dialog[open]'))return;
 try{if(localStorage.getItem(pushSetupKey())==='seen')return;}catch{}
 pushOfferShown=true;
 const supported='Notification' in window&&'PushManager' in window&&'serviceWorker' in navigator;
 const denied=supported&&Notification.permission==='denied';
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','push-welcome-title');
 dialog.innerHTML='<h2 id="push-welcome-title">Szeretnél értesítéseket kapni?</h2><p>Az engedélyezéssel a rendelési emlékeztetők mellett a hírekről és akciókról szóló értesítéseket is bekapcsolod. Ezeket később külön kikapcsolhatod a Beállításokban.</p><p>'+(denied?'Az értesítéseket korábban letiltottad. Engedélyezd őket a böngésző vagy telefon beállításaiban.':!supported?'iPhone-on először a Megosztás → Főképernyőhöz adás menüvel telepítsd az appot, majd onnan nyisd meg. Ha ott sem elérhető, ellenőrizd a böngésző támogatását.':'A következő lépésben a böngésző engedélyét is meg kell adnod.')+'</p><p class="small muted">A kézbesítés az eszköz és a háttérszolgáltatás működésétől is függ.</p><p role="alert" id="push-welcome-error"></p><div class="dialog-actions"><button class="button secondary" id="push-later">Most nem</button>'+(supported&&!denied?'<button class="button primary" id="push-accept">Értesítések bekapcsolása</button>':'')+'</div>';
 document.body.append(dialog);
 dialog.querySelector('#push-later').onclick=()=>{rememberPushOffer();dialog.close();};
 dialog.addEventListener('cancel',()=>rememberPushOffer());
 dialog.addEventListener('close',()=>dialog.remove());
 const button=dialog.querySelector('#push-accept');
 if(button)button.onclick=async()=>{button.disabled=true;try{await enablePartnerPush();dialog.close();}catch(e){dialog.querySelector('#push-welcome-error').textContent=e.message;}finally{button.disabled=false;}};
 dialog.showModal();
}

let sessionReminderShown='',sessionSnoozedUntil=0;
function sessionExplanation(){if(role==='staff')return '<details class="section-gap"><summary>Hogyan működik a belépés meghosszabbítása?</summary><p>A céges belépés ezen az eszközön 7 napig marad érvényes. A lejárat előtti 2 napban az alkalmazás megnyitásakor felajánljuk az újabb 7 napot. Ez nem küld push értesítést. Más eszközöket nem érint, és kijelentkezéskor vagy jelszó-visszaállításkor megszűnhet.</p></details>';return '<details class="section-gap"><summary>Miért jár le a belépésem, és hogyan működik a hosszabbítás?</summary><div class="section-gap"><p>A belépésed ezen a böngészőn vagy telepített appon 90 napig marad érvényes. Így nem kell minden rendelés előtt megadnod a jelszavadat. Az app bezárása önmagában nem jelentkeztet ki.</p><p>A lejárat előtti 7 napban felajánljuk a hosszabbítást. Ha megerősíted, a megerősítés időpontjától újabb 90 napig maradsz bejelentkezve ezen az eszközön. A hosszabbítás nem automatikus, és más telefonon vagy böngészőben nem módosítja a belépésedet.</p><p>A „Most nem” nem jelentkeztet ki: az eredeti lejáratig használhatod az appot. Legkorábban 24 óra múlva, az app használatakor újra szólunk. Addig a Beállításokból is hosszabbíthatsz. Ha lejár, újra be kell jelentkezned.</p><p>A határidő azért van, hogy egy régi vagy már nem használt eszközön ne maradjon korlátlan ideig hozzáférés. Csak saját vagy megbízható eszközön hosszabbíts. Közös vagy eladott telefonon jelentkezz ki.</p><p>A kijelentkezés, a jelszó visszaállítása vagy a fiók letiltása a 90 nap letelte előtt is megszüntetheti a hozzáférést. A böngésző adatainak törlése után szintén új belépés szükséges.</p><p>A hosszabbítás nem küld be rendelést, nem törli a piszkozatot, és nem változtatja meg az értesítési beállításokat. A push engedélye külön beállítás; ez a lejárati felhívás az app használatakor jelenik meg, nem háttérben kiküldött értesítés.</p></div></details>';}
function sessionSettings(){
 if(!data.loginSession)return '';
 return '<section class="card section-gap"><h2>Bejelentkezve maradás</h2><p>Ezen az eszközön eddig maradsz bejelentkezve: <strong>'+esc(operationTime(data.loginSession.expiresAt))+'</strong>.</p>'+(data.loginSession.canExtend?'<button class="button primary" data-action="extend-session">Belépés hosszabbítása '+(role==='staff'?7:90)+' napra</button>':'<p>A hosszabbítás a lejárat előtti '+(role==='staff'?2:7)+' napban válik elérhetővé.</p>')+sessionExplanation()+'</section>';
}
function sessionReminderKey(){return 'kebpro-session-reminder:'+role+':'+(data.id||data.currentUserId)+':'+data.loginSession.expiresAt;}
function offerSessionRenewal(){
 if(!data.loginSession?.canExtend||document.querySelector('dialog[open]'))return;
 const key=sessionReminderKey();if(sessionReminderShown===key||Date.now()<sessionSnoozedUntil)return;
 try{if(Number(localStorage.getItem(key))>Date.now())return;}catch{}
 openSessionRenewal();
}
function openSessionRenewal(){
 if(!data.loginSession?.canExtend||document.querySelector('dialog[open]'))return;
 const expiresAt=data.loginSession.expiresAt,key=sessionReminderKey();sessionReminderShown=key;
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','renew-title');
 dialog.innerHTML='<h2 id="renew-title">Hamarosan lejár a belépésed</h2><p>A belépésed lejárata: <strong>'+esc(operationTime(expiresAt))+'</strong>.</p><p>Szeretnél ezen az eszközön a megerősítéstől számított további '+(role==='staff'?7:90)+' napig bejelentkezve maradni?</p>'+sessionExplanation()+'<p role="alert" id="renew-error"></p><div class="dialog-actions"><button class="button secondary" id="renew-later">Most nem</button><button class="button primary" id="renew-accept">Igen, maradjak bejelentkezve</button></div>';
 document.body.append(dialog);
 const snooze=()=>{sessionSnoozedUntil=Date.now()+86400000;sessionReminderShown='';try{localStorage.setItem(key,String(sessionSnoozedUntil));}catch{}};
 dialog.querySelector('#renew-later').onclick=()=>{snooze();dialog.close();};dialog.addEventListener('cancel',snooze);dialog.addEventListener('close',()=>dialog.remove());
 const accept=dialog.querySelector('#renew-accept'),later=dialog.querySelector('#renew-later');let pending=false;
 dialog.addEventListener('cancel',event=>{if(pending)event.preventDefault();});
 accept.onclick=async()=>{pending=true;accept.disabled=true;later.disabled=true;try{const result=await api('extend-session',{expiresAt});data.loginSession=result.loginSession;dialog.close();render();toast('Meghosszabbítottuk a belépésedet eddig: '+operationTime(result.loginSession.expiresAt));}catch(error){dialog.querySelector('#renew-error').textContent=error.message;}finally{pending=false;accept.disabled=false;later.disabled=false;}};
 dialog.showModal();
}
