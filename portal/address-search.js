// One request at a time and at most one per second for the shared public service.
function createAddressSearch({
  fetcher = fetch,
  endpoint = process.env.ADDRESS_SEARCH_URL || 'https://nominatim.openstreetmap.org/search',
} = {}) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Invalid address search URL');
  const cache = new Map();
  let nextRequest = 0;
  let active = false;
  return async function search(query) {
    const text = typeof query === 'string' ? query.trim().replace(/\s+/g, ' ') : '';
    if (text.length < 3 || text.length > 200)
      throw new Error('Adj meg egy legalább 3 karakteres címet.');
    const key = text.toLocaleLowerCase('hu');
    const saved = cache.get(key);
    if (saved && saved.expires > Date.now()) return saved.results;
    if (active || Date.now() < nextRequest)
      throw new Error('Kérlek, várj egy kicsit az új kereséssel.');
    active = true;
    nextRequest = Date.now() + 1100;
    try {
      const request = new URL(url);
      request.searchParams.set('q', text);
      request.searchParams.set('format', 'jsonv2');
      request.searchParams.set('limit', '5');
      request.searchParams.set('accept-language', 'hu');
      const response = await fetcher(request, {
        headers: { 'User-Agent': 'KebproPortal/1.0 (https://kebpro.hu)' },
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('A címkereső most nem érhető el.');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('A címkereső most nem érhető el.');
      const results = data
        .slice(0, 5)
        .map((item) => ({
          label: String(item.display_name || '').slice(0, 400),
          latitude: Number(item.lat),
          longitude: Number(item.lon),
        }))
        .filter(
          (item) =>
            item.label &&
            Number.isFinite(item.latitude) &&
            Number.isFinite(item.longitude) &&
            Math.abs(item.latitude) <= 85 &&
            Math.abs(item.longitude) <= 180,
        );
      if (cache.size >= 500) cache.delete(cache.keys().next().value);
      cache.set(key, { results, expires: Date.now() + 3600000 });
      return results;
    } finally {
      active = false;
    }
  };
}
function createGeoapifySearch({ apiKey, fetcher = fetch }) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw Error('Missing Geoapify API key');
  const cache = new Map();
  return async function search(query) {
    const text = typeof query === 'string' ? query.trim().replace(/\s+/g, ' ') : '';
    if (text.length < 3 || text.length > 200) throw Error('Adj meg egy legalább 3 karakteres címet.');
    const key = text.toLocaleLowerCase('hu');
    const saved = cache.get(key);
    if (saved && saved.expires > Date.now()) return saved.results;
    const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
    for (const [k, v] of Object.entries({ text, format: 'json', lang: 'hu', filter: 'countrycode:hu', limit: '5', apiKey })) url.searchParams.set(k, v);
    const response = await fetcher(url, { signal: AbortSignal.timeout(8000), redirect: 'error' });
    if (!response.ok) throw Error('A címkereső most nem érhető el.');
    const data = await response.json();
    if (!Array.isArray(data.results)) throw Error('A címkereső most nem érhető el.');
    const results = data.results.slice(0, 5).map((r) => ({ label: typeof r.formatted === 'string' ? r.formatted.slice(0, 250) : '', latitude: r.lat, longitude: r.lon })).filter((r) => r.label && typeof r.latitude === 'number' && Number.isFinite(r.latitude) && Math.abs(r.latitude) <= 85 && typeof r.longitude === 'number' && Number.isFinite(r.longitude) && Math.abs(r.longitude) <= 180);
    if (cache.size >= 500) cache.delete(cache.keys().next().value);
    cache.set(key, { results, expires: Date.now() + 3600000 });
    return results;
  };
}
module.exports = { createAddressSearch, createGeoapifySearch };
