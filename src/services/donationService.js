import { demoDonations } from "../data/demoData";
import { readStorage, writeStorage, seedStorage } from "../utils/storage";

const KEY = "mandal_donations";

export const getDonations = () => seedStorage(KEY, demoDonations);

export const addDonation = (donation) => {
  const items = getDonations();
  const next = [
    { ...donation, id: donation.id || `don-${Date.now()}` },
    ...items,
  ];
  writeStorage(KEY, next);
  return next;
};

export const updateDonation = (id, donation) => {
  const items = getDonations().map((entry) =>
    entry.id === id ? { ...entry, ...donation } : entry,
  );
  writeStorage(KEY, items);
  return items;
};

export const deleteDonation = (id) => {
  const items = getDonations().filter((entry) => entry.id !== id);
  writeStorage(KEY, items);
  return items;
};
