const crypto = require("crypto");

function createCacheKey(prefix, value) {
  const serializedValue = JSON.stringify(value);
  const hash = crypto
    .createHash("sha256")
    .update(serializedValue)
    .digest("hex");

  return `${prefix}:${hash}`;
}

function createTtlCache({ ttlMs }) {
  const store = new Map();

  function get(key) {
    const entry = store.get(key);

    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  function set(key, value) {
    store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async function getOrSet(key, createValue) {
    const cachedValue = get(key);

    if (cachedValue !== undefined) {
      return cachedValue;
    }

    const value = await createValue();
    set(key, value);
    return value;
  }

  return { get, set, getOrSet };
}

module.exports = { createCacheKey, createTtlCache };
