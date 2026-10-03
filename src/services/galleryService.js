import { supabase, getSupabaseErrorMessage } from "../lib/supabase";

const GALLERY_BUCKET = "gallery";
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const getGalleryStorageErrorMessage = (error) => {
  const message = error?.message || "";
  const lowerMessage = message.toLowerCase();

  if (
    /bucket not found|no such bucket|not found.*bucket|does not exist.*bucket/i.test(
      message,
    )
  ) {
    return "Gallery bucket is missing in the connected Supabase project. Please create the 'gallery' bucket in the same project used by this app.";
  }

  if (
    /permission denied|policy|forbidden|not allowed|rls|insufficient_privilege|not authorized/i.test(
      lowerMessage,
    )
  ) {
    return "You do not have permission to upload or delete Gallery photos. Check the bucket policies and admin session.";
  }

  if (
    /jwt|token|session|not authenticated|not logged|auth.*user|user.*not.*logged|invalid.*session|refresh token|401|403/i.test(
      lowerMessage,
    )
  ) {
    return "Your Supabase session is invalid or expired. Please sign in again and try the upload.";
  }

  return getSupabaseErrorMessage(error);
};

const getGalleryDatabaseErrorMessage = (error) => {
  const message = error?.message || "";
  const lowerMessage = message.toLowerCase();

  if (
    /does not exist|relation .*gallery|table .*gallery|missing.*gallery/i.test(
      lowerMessage,
    )
  ) {
    return "Gallery database table is not configured. Please run the gallery SQL setup in Supabase.";
  }

  if (
    /permission denied|policy|forbidden|not allowed|rls|insufficient_privilege/i.test(
      lowerMessage,
    )
  ) {
    return "You do not have permission to update the Gallery database. Check the admin policies.";
  }

  if (
    /jwt|token|session|not authenticated|not logged|auth.*user|user.*not.*logged|invalid.*session/i.test(
      lowerMessage,
    )
  ) {
    return "Your Supabase session is invalid or expired. Please sign in again and try the upload.";
  }

  return getSupabaseErrorMessage(error);
};

const getSafeDisplayOrder = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }

  const safeValue = Math.trunc(numericValue);
  return safeValue > 2147483647 ? 0 : safeValue;
};

const normalizeGalleryRecord = (record = {}) => ({
  ...record,
  id: record.id,
  title: record.title || record.name || "",
  description: record.description || record.caption || "",
  caption: record.caption || record.description || "",
  image_url: record.image_url || record.storage_url || "",
  image_path: record.image_path || record.storage_path || "",
  storage_path: record.storage_path || record.image_path || "",
  uploaded_by: record.uploaded_by || null,
  display_order: getSafeDisplayOrder(record.display_order),
});

export const getGalleryImages = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("gallery")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(getSupabaseErrorMessage(error));
  return (data || []).map(normalizeGalleryRecord);
};

export const uploadGalleryImage = async (file, metadata = {}) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const fileType = file.type || "image/jpeg";
  if (
    !ALLOWED_IMAGE_TYPES.includes(fileType) &&
    !/\.(jpe?g|png|webp)$/i.test(file.name || "")
  ) {
    throw new Error("Only JPG, JPEG, PNG, and WEBP files are allowed.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Please choose an image smaller than 8MB.");
  }

  const userId = metadata.userId || "anonymous";
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
  const uniqueSuffix =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const storagePath = `gallery/${userId}/${uniqueSuffix}.${extension}`;

  let uploadData;

  try {
    const { data, error } = await supabase.storage
      .from(GALLERY_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: fileType,
      });

    if (error) {
      throw error;
    }

    uploadData = data;
  } catch (error) {
    throw new Error(getGalleryStorageErrorMessage(error));
  }

  const { data: publicUrlData } = supabase.storage
    .from(GALLERY_BUCKET)
    .getPublicUrl(uploadData.path);

  const safeDisplayOrder = getSafeDisplayOrder(metadata.display_order);

  const preferredPayload = {
    storage_path: uploadData.path,
    image_url: publicUrlData.publicUrl,
    title: metadata.title || file.name.replace(/\.[^.]+$/, ""),
    caption: metadata.caption || metadata.description || "",
    uploaded_by: metadata.uploaded_by || null,
    display_order: safeDisplayOrder,
  };

  const legacyPayload = {
    image_path: uploadData.path,
    image_url: publicUrlData.publicUrl,
    title: preferredPayload.title,
    description: preferredPayload.caption,
    uploaded_by: preferredPayload.uploaded_by,
    display_order: safeDisplayOrder,
  };

  let insertedData;
  let insertError;

  try {
    const result = await supabase
      .from("gallery")
      .insert([preferredPayload])
      .select()
      .single();

    insertedData = result.data;
    insertError = result.error;
  } catch (error) {
    insertError = error;
  }

  if (insertError) {
    const fallbackResult = await supabase
      .from("gallery")
      .insert([legacyPayload])
      .select()
      .single();

    if (fallbackResult.error) {
      try {
        await supabase.storage.from(GALLERY_BUCKET).remove([uploadData.path]);
      } catch {
        // Ignore cleanup errors; report the original database issue.
      }

      throw new Error(getGalleryDatabaseErrorMessage(fallbackResult.error));
    }

    insertedData = fallbackResult.data;
  }

  return normalizeGalleryRecord(insertedData);
};

export const updateGalleryImage = async (id, updates = {}) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const safeTitle = String(updates.title ?? "").trim();
  const safeCaption = String(updates.caption ?? "").trim();

  const payload = {};

  if (typeof updates.title !== "undefined") {
    payload.title = safeTitle;
  }

  if (typeof updates.caption !== "undefined") {
    payload.caption = safeCaption;
    payload.description = safeCaption;
  }

  if (!Object.keys(payload).length) {
    return null;
  }

  const { data, error } = await supabase
    .from("gallery")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(getGalleryDatabaseErrorMessage(error));
  }

  return normalizeGalleryRecord(data);
};

export const deleteGalleryImage = async (record) => {
  if (!supabase) throw new Error("Supabase is not configured.");

  const storagePath = record?.storage_path || record?.image_path || "";
  if (storagePath) {
    const { error: storageDeleteError } = await supabase.storage
      .from(GALLERY_BUCKET)
      .remove([storagePath]);

    if (storageDeleteError) {
      throw new Error(getGalleryStorageErrorMessage(storageDeleteError));
    }
  }

  const { error } = await supabase.from("gallery").delete().eq("id", record.id);

  if (error) throw new Error(getGalleryDatabaseErrorMessage(error));
  return true;
};
