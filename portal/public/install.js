(() => {
 const base=document.body.dataset.base || (document.body.dataset.role==='staff'?'/partner-admin':'/partner');
 let promptEvent;
 const dialog=document.createElement('dialog'); dialog.setAttribute('aria-label','Alkalmazás telepítése');
 dialog.innerHTML='<h2>Kebpro a kezdőképernyőn</h2><p>Így legközelebb egy érintéssel megnyithatod.</p><h3>Android · Chrome</h3><ol><li>Nyisd meg az oldalt a Chrome böngészőben.</li><li>A ⋮ menüben válaszd a „Hozzáadás a kezdőképernyőhöz” vagy „Alkalmazás telepítése” lehetőséget.</li><li>Erősítsd meg, majd indítsd el az új ikonnal.</li></ol><h3>iPhone · Safari</h3><ol><li>Nyisd meg az oldalt Safariban.</li><li>Koppints a Megosztás ikonra, majd a „Főképernyőhöz adás” lehetőségre.</li><li>Ha megjelenik, hagyd bekapcsolva a webalkalmazásként megnyitást, majd koppints a Hozzáadásra.</li></ol><p class="small muted">A menüpontok készülékenként eltérhetnek. Az értesítéseket belépés után a Beállításokban engedélyezheted. A localhost cím csak ezen a számítógépen érhető el; telefonos telepítéshez később HTTPS-es cím szükséges.</p><div class="dialog-actions"><button class="button primary" id="native-install" hidden>Telepítés</button><button class="button secondary" id="close-install">Értem</button></div>';
 document.body.append(dialog);
 document.addEventListener('click',e=>{if(e.target.closest('[data-install-help]'))dialog.showModal();});
 dialog.querySelector('#close-install').onclick=()=>dialog.close();
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();promptEvent=e;dialog.querySelector('#native-install').hidden=false;});
 dialog.querySelector('#native-install').onclick=async()=>{if(promptEvent){await promptEvent.prompt();promptEvent=null;dialog.querySelector('#native-install').hidden=true;}};
 if('serviceWorker' in navigator)navigator.serviceWorker.register(base+'/sw.js',{scope:base+'/'}).catch(()=>{});
})();
