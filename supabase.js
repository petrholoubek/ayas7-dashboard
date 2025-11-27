import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hurayrwshmsvsylhwlbj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1cmF5cndzaG1zdnN5bGh3bGJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTk4MzEsImV4cCI6MjA3OTc5NTgzMX0.Q0KpZX_Dln9_9OwZcCty-bbyw8drX84ax098Uy03VUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
