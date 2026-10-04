/* =========================================
   OV APP — SUPABASE CONFIG
========================================= */

const OV_SUPABASE_URL = "https://nnvnkcrccydicdyfsssq.supabase.co";

const OV_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_-rtJF4vbWTOMRKVcnhj6Aw_bn22OTLs";

const ovSupabase = window.supabase.createClient(
  OV_SUPABASE_URL,
  OV_SUPABASE_PUBLISHABLE_KEY
);
