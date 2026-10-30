if (window.KebproReactAuth) {
  window.KebproReactAuth.mountToken(document.querySelector('.login-card'), 'invitation');
} else {
  const token = location.hash.slice(1);
  history.replaceState(null, '', location.pathname);
  const form = document.getElementById('invitation-form'),
    message = document.getElementById('invitation-message');
  if (!/^[a-f0-9]{64}$/.test(token)) {
    form.hidden = true;
    message.textContent =
      'Hiányzó vagy érvénytelen meghívó. Nyisd meg az e-mailben kapott teljes linket, vagy kérj új meghívást egy céges admintól.';
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form)),
      button = event.submitter;
    button.disabled = true;
    try {
      if (values.password !== values.confirmation) throw new Error('A két jelszó nem egyezik.');
      const response = await fetch('/partner-admin/api/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username: values.username, password: values.password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Nem sikerült létrehozni a fiókot.');
      form.reset();
      form.hidden = true;
      message.textContent =
        'A céges fiókod elkészült, az e-mail-címed igazolva. Most már bejelentkezhetsz a saját adataiddal.';
    } catch (error) {
      message.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}
