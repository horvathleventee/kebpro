if (window.KebproReactAuth) {
  window.KebproReactAuth.mountToken(document.querySelector('.login-card'),'reset');
} else {
const token=location.hash.slice(1);
history.replaceState(null,'',location.pathname);
const form=document.getElementById('reset-form'), message=document.getElementById('reset-message');
if(!/^[a-f0-9]{64}$/.test(token)){form.hidden=true;message.textContent='A link hiányos vagy érvénytelen. A belépőoldalon kérj új visszaállító linket.';}
form.addEventListener('submit',async event=>{
 event.preventDefault();const values=Object.fromEntries(new FormData(form)),button=event.submitter;button.disabled=true;
 try{
  if(values.password!==values.confirmation)throw new Error('A két jelszó nem egyezik.');
  const response=await fetch(document.body.dataset.base+'/api/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password:values.password})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||'Nem sikerült menteni.');
  form.reset();form.hidden=true;message.textContent='A jelszavad elmentettük. Minden korábbi belépésedet lezártuk; az új jelszóval jelentkezz be. Ha a regisztrációd még jóváhagyásra vár, ezután is szükséges a céges jóváhagyás.';
 }catch(error){message.textContent=error.message;}finally{button.disabled=false;}
});

}
