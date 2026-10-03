import { supabase, getSupabaseErrorMessage } from "../lib/supabase";

export const getIncome = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("income")
    .select("*")
    .order("income_date", { ascending: false });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data || [];
};

export const addIncome = async (entry) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload = {
    source: entry.source || "Donation",
    amount: Number(entry.amount || 0),
    description: entry.description || "",
    income_date: entry.income_date || new Date().toISOString().slice(0, 10),
  };

  const { data, error } = await supabase
    .from("income")
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};

export const updateIncome = async (id, entry) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload = {
    source: entry.source || "Donation",
    amount: Number(entry.amount || 0),
    description: entry.description || "",
    income_date: entry.income_date || new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("income")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};
