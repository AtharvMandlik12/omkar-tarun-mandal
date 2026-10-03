import { demoMembers } from "../data/demoData";
import { writeStorage, seedStorage } from "../utils/storage";

const KEY = "mandal_members";

export const getMembers = () => seedStorage(KEY, demoMembers);

export const addMember = (member) => {
  const items = getMembers();
  const next = [{ ...member, id: `mem-${Date.now()}` }, ...items];
  writeStorage(KEY, next);
  return next;
};

export const updateMember = (id, member) => {
  const items = getMembers().map((entry) =>
    entry.id === id ? { ...entry, ...member } : entry,
  );
  writeStorage(KEY, items);
  return items;
};
