self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><h1>Nincs internetkapcsolat</h1><p>A céges adatokhoz kapcsolódj az internethez, majd frissítsd az oldalt.</p></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}})));
});
