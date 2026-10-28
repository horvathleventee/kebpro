function registrationEmail(account) {
  // Explicit allowlist: never spread the registration request or stored user into an email.
  return {
    to: account.email,
    subject: 'Kebpro · Regisztráció visszaigazolása',
    text: [
      'Köszönjük a regisztrációdat a Kebpro partnerfelületére!',
      '',
      'A regisztrációd során az alábbi adatokat rögzítettük:',
      'Cég / üzlet neve: ' + account.company,
      'Kapcsolattartó: ' + account.contact,
      'Szállítási cím: ' + account.address,
      'Telefonszám: ' + account.phone,
      'E-mail-cím: ' + account.email,
      'Felhasználónév: ' + account.username,
      '',
      'Állapot: céges jóváhagyásra vár.',
      'A rendelési felületet a Kebpro munkatársainak jóváhagyása után használhatod. Ez a levél a regisztráció rögzítését igazolja, nem a hozzáférés jóváhagyását.',
      '',
      'Ha valamelyik adat hibás, vagy nem te kezdeményezted a regisztrációt, keresd a Kebpro munkatársait.',
      '',
      'Üdvözlettel:',
      'Halasi Kebpro Kft.',
    ].join('\n'),
  };
}
module.exports = { registrationEmail };
