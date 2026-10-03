import { supabase, getSupabaseErrorMessage } from "../lib/supabase";

export const getAdmins = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data || [];
};

export const addAdmin = async (admin) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload = {
    name: admin.name,
    mobile_number: admin.mobile_number || admin.mobile || "",
    email: admin.email || "",
    role: admin.role || "Admin",
  };

  const { data, error } = await supabase
    .from("admins")
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};

export const updateAdmin = async (id, admin) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload = {
    name: admin.name,
    mobile_number: admin.mobile_number || admin.mobile || "",
    email: admin.email || "",
    role: admin.role || "Admin",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("admins")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};
