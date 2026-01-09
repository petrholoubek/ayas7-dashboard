import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://azfrniqqtetoqploxwgq.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6ZnJuaXFxdGV0b3FwbG94d2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzQ1OTYsImV4cCI6MjA4MzMxMDU5Nn0.QchmzNhs8owd6pkjZCk04u6PJoJ2Bhzz7oGV0KFyqdU"
);

const LOGIN_URL = "https://www.ayas7.com/login/index.html";

(async () => {
  const { data: { session } } = await supabase.auth.getSession();

  // 🔒 nepřihlášen → AYAS7 LOGIN
  if (!session) {
    window.location.replace(LOGIN_URL);
    return;
  }

  // 👤 user bar (pokud existuje)
  const userBar = document.getElementById("user-bar");
  const emailEl = document.getElementById("user-email");
  const logoutBtn = document.getElementById("logout");

  if (userBar && session.user) {
    emailEl.textContent = session.user.email;
    userBar.style.display = "flex";

    logoutBtn.onclick = async (e) => {
      e.preventDefault();
      await supabase.auth.signOut();
      window.location.replace(LOGIN_URL);
    };
  }
})();
