const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function signInPortalUser(email, password) {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const authError = new Error("Usuario ou senha invalidos.");
    authError.status = 401;
    throw authError;
  }

  const user = data.user;
  const profile = await getPortalProfile(supabase, user);

  return {
    id: user.id,
    name: profile?.name || user.user_metadata?.name || user.email,
    email: user.email,
    company: profile?.company || user.user_metadata?.company || "",
    callerId: profile?.caller_id || "",
    role: profile?.role || "Cliente",
  };
}

async function getPortalProfile(supabase, user) {
  const { data, error } = await supabase
    .from("portal_profiles")
    .select("name, company, caller_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return null;
  return data;
}

module.exports = {
  isSupabaseConfigured,
  signInPortalUser,
};
