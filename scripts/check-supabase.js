require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo .env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { error } = await supabase.from("portal_profiles").select("id").limit(1);

  if (error) {
    if (error.code === "PGRST205" || error.message?.includes("portal_profiles")) {
      console.error("Conexao OK, mas a tabela portal_profiles nao existe.");
      console.error("Rode o SQL de supabase/schema.sql no SQL Editor do Supabase.");
      process.exit(1);
    }

    console.error("Erro ao conectar:", error.message);
    process.exit(1);
  }

  console.log("Supabase conectado com sucesso.");
}

main();
