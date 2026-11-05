import React from 'react';

export function splitMobilePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  const national = digits.startsWith('36')
    ? digits.slice(2)
    : digits.startsWith('06')
      ? digits.slice(2)
      : digits;
  const match = national.match(/^(20|30|31|50|70)(\d{7})$/);
  return match ? { prefix: match[1], number: match[2] } : { prefix: '', number: '' };
}

export function PhoneFields({
  prefix,
  number,
  onPrefix,
  onNumber,
}: {
  prefix: string;
  number: string;
  onPrefix(value: string): void;
  onNumber(value: string): void;
}) {
  return (
    <fieldset className="phone-fields">
      <legend>Mobiltelefonszám</legend>
      <div className="phone-fields-row">
        <span className="phone-country" aria-label="Országhívó">
          +36
        </span>
        <label>
          Előhívó
          <input
            name="phonePrefix"
            type="tel"
            inputMode="numeric"
            value={prefix}
            onChange={(e) => onPrefix(e.target.value.replace(/\D/g, '').slice(0, 2))}
            minLength={2}
            maxLength={2}
            pattern="20|30|31|50|70"
            required
            placeholder="30"
          />
        </label>
        <label>
          Telefonszám
          <input
            name="phoneNumber"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={number}
            onChange={(e) => onNumber(e.target.value.replace(/\D/g, '').slice(0, 7))}
            minLength={7}
            maxLength={7}
            pattern="[0-9]{7}"
            required
            placeholder="1234567"
          />
        </label>
      </div>
      <small>Add meg az előhívó utáni 7 számjegyet.</small>
    </fieldset>
  );
}
