if (window.KebproReactAuth) {
  window.KebproReactAuth.mountLogin(document.querySelector('.login-card'));
} else {
  const base = document.body.dataset.base;
  const message = document.getElementById('login-error');
  document.querySelectorAll('[data-auth-tab]').forEach((button) =>
    button.addEventListener('click', () => {
      const register = button.dataset.authTab === 'register';
      document.getElementById('forgot-form').hidden = true;
      document.getElementById('login-form').hidden = register;
      document.getElementById('register-form').hidden = !register;
      document.querySelectorAll('[data-auth-tab]').forEach((b) => {
        const active = b === button;
        b.setAttribute('aria-pressed', String(active));
        b.classList.toggle('primary', active);
        b.classList.toggle('secondary', !active);
      });
      message.textContent = '';
    }),
  );
  document.querySelectorAll('form').forEach((form) =>
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.submitter;
      button.disabled = true;
      message.textContent = '';
      try {
        const values = Object.fromEntries(new FormData(form));
        const registering = form.id === 'register-form',
          forgetting = form.id === 'forgot-form';
        if (registering) values.termsAccepted = values.termsAccepted === 'on';
        if (registering && values.password !== values.confirmation)
          throw new Error('A két jelszó nem egyezik.');
        delete values.confirmation;
        const response = await fetch(
          base + '/api/' + (registering ? 'register' : forgetting ? 'forgot-password' : 'login'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
          },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Nem sikerült a művelet.');
        if (forgetting) {
          form.reset();
          message.textContent = result.message;
        } else if (registering) {
          form.reset();
          document.querySelector('[data-auth-tab="login"]').click();
          message.textContent =
            'A regisztrációdat rögzítettük. A céges jóváhagyás után itt tudsz bejelentkezni. ' +
            (result.emailSent
              ? 'A megadott adatokról visszaigazoló e-mailt küldtünk. Ellenőrizd a levélszemét mappát is.'
              : 'A visszaigazoló e-mailt most nem sikerült elküldeni, de a regisztrációd megmaradt. Nem kell újra regisztrálnod.');
        } else location.href = result.next;
      } catch (error) {
        message.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    }),
  );

  function showForgot(show) {
    document.getElementById('login-form').hidden = show;
    document.getElementById('forgot-form').hidden = !show;
    const register = document.getElementById('register-form');
    if (register) register.hidden = true;
    message.textContent = '';
    document
      .querySelectorAll('[data-auth-tab]')
      .forEach((b) =>
        b.setAttribute('aria-pressed', String(!show && b.dataset.authTab === 'login')),
      );
  }
  document.getElementById('forgot-password').onclick = () => showForgot(true);
  document.getElementById('back-login').onclick = () => showForgot(false);
}
