import { supabase, getSupabaseErrorMessage } from "../lib/supabase";

export const getBookings = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data || [];
};

export const addBooking = async (entry) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload = {
    name: entry.name || "",
    mobile_number: entry.mobile_number || "",
    booking_date: entry.booking_date || new Date().toISOString().slice(0, 10),
    description: entry.description || "",
    status: entry.status || "Pending",
  };

  const { data, error } = await supabase
    .from("bookings")
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};

export const updateBooking = async (id, entry) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const payload = {
    name: entry.name || "",
    mobile_number: entry.mobile_number || "",
    booking_date: entry.booking_date || new Date().toISOString().slice(0, 10),
    description: entry.description || "",
    status: entry.status || "Pending",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("bookings")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return data;
};
