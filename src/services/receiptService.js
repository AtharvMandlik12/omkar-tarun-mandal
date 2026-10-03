import { supabase, getSupabaseErrorMessage } from "../lib/supabase";
import {
  buildReceiptPayload,
  generateReceiptNumber,
  normalizeIndianMobile,
} from "../utils/receiptUtils";

const ensureAdminAccess = async () => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user?.email) {
    throw new Error("Authentication required to manage receipts.");
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admins")
    .select("id, email")
    .ilike("email", user.email)
    .maybeSingle();

  if (adminError) {
    throw new Error(getSupabaseErrorMessage(adminError));
  }

  if (!adminRow) {
    throw new Error("Admin access required to manage receipts.");
  }

  return { user, admin: adminRow };
};

const getNextGeneratedReceiptNumber = async (prefix = "TRIAL") => {
  const { data = [] } = await supabase
    .from("receipts")
    .select("receipt_number")
    .not("receipt_number", "is", null);

  const usedNumbers = (data || [])
    .map((entry) => entry.receipt_number)
    .filter(Boolean);

  let nextNumber = 1;
  let candidate = generateReceiptNumber(prefix, nextNumber, 3, usedNumbers);

  while (usedNumbers.includes(candidate)) {
    nextNumber += 1;
    candidate = generateReceiptNumber(prefix, nextNumber, 3, usedNumbers);
  }

  return candidate;
};

export const getReceipts = async () => {
  if (!supabase) return [];

  try {
    await ensureAdminAccess();
  } catch {
    return [];
  }

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data || [];
};

export const addReceipt = async (receipt) => {
  await ensureAdminAccess();

  const payload = buildReceiptPayload(receipt);
  const normalizedNumber = normalizeIndianMobile(
    payload.whatsapp_number || payload.mobile_number || "",
  );
  if (!payload.receipt_number) {
    payload.receipt_number = await getNextGeneratedReceiptNumber("TRIAL");
  }
  payload.mobile_number = normalizedNumber;
  payload.whatsapp_number = normalizedNumber;

  let attempts = 0;
  while (attempts < 5) {
    const { data, error } = await supabase
      .from("receipts")
      .insert([payload])
      .select()
      .single();

    if (!error) return data;

    const isDuplicateReceipt =
      error?.code === "23505" ||
      /duplicate|already exists/i.test(error.message);

    if (isDuplicateReceipt) {
      attempts += 1;
      const nextNumber = generateReceiptNumber(
        "TRIAL",
        Number(String(payload.receipt_number).match(/(\d+)$/)?.[1] || 1) +
          attempts,
        3,
        [payload.receipt_number],
      );
      payload.receipt_number = nextNumber;
      continue;
    }

    throw new Error(getSupabaseErrorMessage(error));
  }

  throw new Error("Unable to save receipt. Please try again.");
};

export const updateReceipt = async (id, receipt) => {
  await ensureAdminAccess();

  const payload = buildReceiptPayload(receipt);
  const normalizedNumber = normalizeIndianMobile(
    payload.whatsapp_number || payload.mobile_number || "",
  );
  payload.mobile_number = normalizedNumber;
  payload.whatsapp_number = normalizedNumber;

  const { data, error } = await supabase
    .from("receipts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};

export const deleteReceipt = async (id) => {
  await ensureAdminAccess();

  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) throw new Error(getSupabaseErrorMessage(error));
  return true;
};
