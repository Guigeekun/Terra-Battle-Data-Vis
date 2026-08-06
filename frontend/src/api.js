const endpoints = {
  characters: '/api/characters',
  buddies:    '/api/buddies',
  items:      '/api/items',
  skills:     '/api/skills',
  stages:     '/api/stages',
  strings:    '/api/strings',
  audio:      '/api/audio',
  assets:     '/api/assets',
};

export async function fetchAllData() {
  const keys = Object.keys(endpoints);
  const results = await Promise.all(
    Object.values(endpoints).map(url => fetch(url).then(r => r.json()))
  );
  const data = {};
  keys.forEach((key, i) => { data[key] = results[i]; });
  return data;
}

export async function fetchItemDetails(itemId) {
  const res = await fetch(`/api/item/${itemId}`);
  return res.json();
}
