import { demoDevotees } from "../data/demoData";
import { readStorage, writeStorage, seedStorage } from "../utils/storage";

const KEY = "mandal_devotees";

export const getDevotees = () => seedStorage(KEY, demoDevotees);

export const addDevotee = (devotee) => {
  const items = getDevotees();
  const next = [{ ...devotee, id: `dev-${Date.now()}` }, ...items];
  writeStorage(KEY, next);
  return next;
};

export const updateDevotee = (id, devotee) => {
  const items = getDevotees().map((entry) =>
    entry.id === id ? { ...entry, ...devotee } : entry,
  );
  writeStorage(KEY, items);
  return items;
};

export const deleteDevotee = (id) => {
  const items = getDevotees().filter((entry) => entry.id !== id);
  writeStorage(KEY, items);
  return items;
};
