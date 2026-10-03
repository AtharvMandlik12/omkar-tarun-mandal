import { demoEvents } from "../data/demoData";
import { readStorage, writeStorage, seedStorage } from "../utils/storage";

const KEY = "mandal_events";

export const getEvents = () => seedStorage(KEY, demoEvents);

export const addEvent = (event) => {
  const items = getEvents();
  const next = [{ ...event, id: `evt-${Date.now()}` }, ...items];
  writeStorage(KEY, next);
  return next;
};

export const updateEvent = (id, event) => {
  const items = getEvents().map((entry) =>
    entry.id === id ? { ...entry, ...event } : entry,
  );
  writeStorage(KEY, items);
  return items;
};

export const deleteEvent = (id) => {
  const items = getEvents().filter((entry) => entry.id !== id);
  writeStorage(KEY, items);
  return items;
};
