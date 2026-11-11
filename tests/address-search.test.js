const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createAddressSearch } = require('../portal/address-search');
const { createGeoapifySearch } = require('../portal/address-search');

test('Geoapify adapter filters invalid results and caches valid matches', async () => {
  let calls = 0;
  const search = createGeoapifySearch({
    apiKey: 'test-key',
    fetcher: async (url) => {
      calls++;
      assert.equal(url.searchParams.get('filter'), 'countrycode:hu');
      assert.equal(url.searchParams.get('text'), 'Budapest Deák');
      return {
        ok: true,
        json: async () => ({
          results: [
            { formatted: 'Budapest Deák', lat: 47.5, lon: 19.1 },
            { formatted: 'bad', lat: null, lon: 19 },
          ],
        }),
      };
    },
  });
  assert.deepEqual(await search('Budapest Deák'), [
    { label: 'Budapest Deák', latitude: 47.5, longitude: 19.1 },
  ]);
  assert.equal((await search('Budapest Deák')).length, 1);
  assert.equal(calls, 1);
});

test('explicit address searches validate, cache and sanitize provider results', async () => {
  let calls = 0;
  const search = createAddressSearch({
    fetcher: async (url) => {
      calls++;
      assert.equal(url.searchParams.get('q'), 'Budapest teszt utca 1');
      return {
        ok: true,
        json: async () => [
          { display_name: 'Budapest, Teszt utca 1', lat: '47.5', lon: '19.1', private: 'discard' },
          { display_name: 'invalid', lat: '200', lon: '19' },
        ],
      };
    },
  });
  await assert.rejects(search('ab'));
  const expected = [{ label: 'Budapest, Teszt utca 1', latitude: 47.5, longitude: 19.1 }];
  assert.deepEqual(await search('Budapest teszt utca 1'), expected);
  assert.deepEqual(await search('budapest teszt utca 1'), expected);
  assert.equal(calls, 1);
  await assert.rejects(search('másik cím'), /várj/);
});
