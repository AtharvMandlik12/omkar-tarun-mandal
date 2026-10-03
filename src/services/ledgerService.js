import { demoLedger } from "../data/demoData";
import { writeStorage, seedStorage } from "../utils/storage";

const KEY = "mandal_ledger";

export const getLedger = () => seedStorage(KEY, demoLedger);

export const saveLedgerEntry = (entry) => {
  const items = getLedger();
  const next = [{ ...entry, id: `ld-${Date.now()}` }, ...items];
  writeStorage(KEY, next);
  return next;
};
