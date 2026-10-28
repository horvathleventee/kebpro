self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="hu"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><h1>Nincs internetkapcsolat</h1><p>A céges adatokhoz kapcsolódj az internethez, majd frissítsd az oldalt.</p></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}})));
});
self.addEventListener('push',event=>{
 let data={};try{data=event.data.json()}catch{}
 const url=typeof data.url==='string'&&data.url.startsWith('/partner-admin/')?data.url:'/partner-admin/';
 event.waitUntil(self.registration.showNotification(data.title||'Kebpro Admin',{body:data.body||'Új rendelés érkezett.',icon:'/partner/assets/admin-v2-192.png',tag:data.id||'kebpro-admin',data:{url}}));
});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.openWindow(event.notification.data?.url||'/partner-admin/'));});
