import { supabase, isSupabaseConfigured } from "../lib/supabase";

const normalizeDisplayName = (value = "") => {
  const cleaned = String(value || "")
    .trim()
    .split(/[._-]/)
    .filter(Boolean)
    .map(
      (segment) =>
        segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join(" ");

  return cleaned || "Admin";
};

export const buildAdminProfilePayload = (user = {}) => {
  const email = String(user?.email || "")
    .trim()
    .toLowerCase();
  const fullName = String(user?.user_metadata?.full_name || "").trim();
  const fallbackName = email ? email.split("@")[0] : "Admin";

  return {
    name: fullName || normalizeDisplayName(fallbackName),
    email,
    role: "Admin",
    mobile_number: "",
  };
};

const ensureAdminProfileForCurrentUser = async () => {
  if (!supabase) return null;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    return null;
  }

  const payload = buildAdminProfilePayload(user);
  const { data: adminRecord, error: lookupError } = await supabase
    .from("admins")
    .select("id, name, email, role")
    .ilike("email", payload.email)
    .maybeSingle();

  if (lookupError) {
    console.error("Admin lookup error:", lookupError);
    return null;
  }

  if (adminRecord) {
    return adminRecord;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("admins")
    .insert([payload])
    .select("id, name, email, role")
    .single();

  if (insertError) {
    console.error("Unable to create admin profile:", insertError);
    return null;
  }

  return inserted;
};

export const getSessionUser = async () => {
  if (!supabase) return null;

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Supabase session error:", error);
    return null;
  }

  const user = session?.user;
  if (!user) return null;

  const adminProfile = await ensureAdminProfileForCurrentUser();

  return {
    id: user.id,
    name:
      adminProfile?.name ||
      user.user_metadata?.full_name ||
      normalizeDisplayName(user.email?.split("@")[0] || "Admin"),
    email: user.email,
    role: adminProfile?.role || "Admin",
  };
};

export const logout = async () => {
  if (supabase) {
    await supabase.auth.signOut();
  }
};

export const login = async ({ email, password }) => {
  const emailValue = String(email || "").trim();
  const passwordValue = String(password || "");

  if (!emailValue) {
    return { ok: false, message: "Please enter your email address." };
  }

  if (!passwordValue) {
    return { ok: false, message: "Please enter your password." };
  }

  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: false,
      message: "Supabase is not configured.",
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailValue,
    password: passwordValue,
  });

  if (error) {
    console.error("Supabase login error:", error);
    return {
      ok: false,
      message: error.message || "Invalid login credentials",
    };
  }

  const user = {
    id: data.user.id,
    name:
      data.user.user_metadata?.full_name ||
      data.user.email?.split("@")[0] ||
      "Admin User",
    email: data.user.email,
    role: "Super Admin",
  };

  return {
    ok: true,
    user,
    session: data.session,
  };
};
