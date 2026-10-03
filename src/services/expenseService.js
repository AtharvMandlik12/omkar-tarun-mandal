import { supabase, getSupabaseErrorMessage } from "../lib/supabase";

export const getExpenses = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data || [];
};

export const addExpense = async (expense) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload = {
    expense_name: expense.expense_name || expense.title || "Expense",
    amount: Number(expense.amount || 0),
    description: expense.description || "",
    expense_date:
      expense.expense_date ||
      expense.date ||
      new Date().toISOString().slice(0, 10),
  };

  const { data, error } = await supabase
    .from("expenses")
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};

export const updateExpense = async (id, expense) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload = {
    expense_name: expense.expense_name || expense.title || "Expense",
    amount: Number(expense.amount || 0),
    description: expense.description || "",
    expense_date:
      expense.expense_date ||
      expense.date ||
      new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("expenses")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};

export const deleteExpense = async (id) => {
  if (!supabase) return [];

  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(getSupabaseErrorMessage(error));
  return true;
};
