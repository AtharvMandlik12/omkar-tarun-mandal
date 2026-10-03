import { demoSponsors } from "../data/demoData";
import { writeStorage, seedStorage } from "../utils/storage";

const KEY = "mandal_sponsors";

export const getSponsors = () => seedStorage(KEY, demoSponsors);

export const addSponsor = (sponsor) => {
  const items = getSponsors();
  const next = [{ ...sponsor, id: `sp-${Date.now()}` }, ...items];
  writeStorage(KEY, next);
  return next;
};

export const updateSponsor = (id, sponsor) => {
  const items = getSponsors().map((entry) =>
    entry.id === id ? { ...entry, ...sponsor } : entry,
  );
  writeStorage(KEY, items);
  return items;
};

export const deleteSponsor = (id) => {
  const items = getSponsors().filter((entry) => entry.id !== id);
  writeStorage(KEY, items);
  return items;
};
