// Bundled by build.mjs into a classic IIFE script that replaces vendor/supabase.js.
// The app only needs the global `supabase.createClient(...)` (js/core/app.js).
import { createClient } from '@supabase/supabase-js';

window.supabase = { createClient };
