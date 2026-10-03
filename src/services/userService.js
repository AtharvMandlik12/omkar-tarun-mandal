import { demoUsers } from "../data/demoData";
import { writeStorage, seedStorage } from "../utils/storage";

const KEY = "mandal_users";

export const getUsers = () => seedStorage(KEY, demoUsers);

export const addUser = (user) => {
  const items = getUsers();
  const next = [{ ...user, id: `usr-${Date.now()}` }, ...items];
  writeStorage(KEY, next);
  return next;
};

export const updateUser = (id, user) => {
  const items = getUsers().map((entry) =>
    entry.id === id ? { ...entry, ...user } : entry,
  );
  writeStorage(KEY, items);
  return items;
};
