export const readStorage = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const seedStorage = (key, data) => {
  const current = readStorage(key, null);
  if (!current) {
    writeStorage(key, data);
    return data;
  }
  return current;
};
