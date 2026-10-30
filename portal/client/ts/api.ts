export interface PortalApiOptions {
  base: string;
  csrf: string;
  fetchImpl: typeof fetch;
  isOnline: () => boolean;
  saveDraft: () => void;
  onMutationStart: () => void;
  onMutationEnd: () => void;
  onUnauthorized: () => void;
}

// The response type is selected by the caller; server responses still require runtime validation.
export function createPortalApi({
  base,
  csrf,
  fetchImpl,
  isOnline,
  saveDraft,
  onMutationStart,
  onMutationEnd,
  onUnauthorized,
}: PortalApiOptions) {
  return async function request<T = unknown>(
    path: string,
    body?: unknown,
    method = 'POST',
  ): Promise<T> {
    if (path === 'responses') saveDraft();
    const mutating = body !== undefined;
    if (mutating) onMutationStart();
    let response: Response;
    try {
      response = await fetchImpl(
        base + '/api/' + path,
        mutating
          ? {
              method,
              headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
              body: JSON.stringify(body),
            }
          : {},
      );
    } catch {
      if (path === 'responses') {
        saveDraft();
        throw new Error(
          'Nem kaptunk visszaigazolást. A piszkozat megmaradt. Kapcsolódj újra, majd ellenőrizd a Rendeléseim oldalt, mielőtt újrapróbálod.',
        );
      }
      throw new Error(
        isOnline() === false
          ? 'Nincs internetkapcsolat. Ellenőrizd a kapcsolatot, majd próbáld újra.'
          : 'Nem sikerült elérni a kiszolgálót. Próbáld újra később.',
      );
    } finally {
      if (mutating) onMutationEnd();
    }
    if (response.status === 401) {
      onUnauthorized();
      throw new Error('Jelentkezz be újra.');
    }
    if (response.status >= 500) {
      if (path === 'responses') saveDraft();
      throw new Error(
        'Az alkalmazás kiszolgálója átmenetileg nem elérhető. Próbáld újra később.' +
          (path === 'responses'
            ? ' A piszkozat megmaradt; ellenőrizd a Rendeléseim oldalt az újrapróbálás előtt.'
            : ''),
      );
    }
    let result: { error?: string };
    try {
      result = await response.json();
    } catch {
      if (path === 'responses') {
        saveDraft();
        throw new Error(
          'Nem kaptunk értelmezhető visszaigazolást. A piszkozat megmaradt. Ellenőrizd a Rendeléseim oldalt az újrapróbálás előtt.',
        );
      }
      throw new Error(
        response.status === 404
          ? 'Ez a funkció ezen a szerveren nem érhető el. Nyisd meg a frissített alkalmazást, vagy frissítsd az oldalt.'
          : 'A kiszolgáló válasza nem értelmezhető. Frissítsd az oldalt, és próbáld újra.',
      );
    }
    if (!response.ok) throw new Error(result.error || 'Nem sikerült menteni.');
    return result as T;
  };
}
