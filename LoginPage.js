const SUPABASE_URL = "https://ycnqeieeoleoadomziji.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljbnFlaWVlb2xlb2Fkb216aWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTg2MDEsImV4cCI6MjEwMTc3NDYwMX0.9PSoayzgE7PoDomvumlkJw22t6VUhqm1JvXBelvyhT4";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById("loginForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const usernameInput = document.getElementById("username").value.trim();
  const passwordInput = document.getElementById("password").value;

  if (!usernameInput || !passwordInput) {
    showAlert("Username dan password harus diisi!", "danger");
    return;
  }

  const email = usernameInput.includes("@")
    ? usernameInput
    : `${usernameInput}@smkpawiyatan.sch.id`;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: passwordInput,
  });

  if (error) {
    console.error("Supabase Auth Error:", error.message);
    showAlert("NISN/NIP atau Password salah!", "danger");
    return;
  }

  if (data?.session) {
    showAlert("Login berhasil! Selamat datang", "success");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);
  } else {
    showAlert("Gagal membuat sesi login.", "danger");
  }
});

function showAlert(message, type) {
  const alertEl = document.getElementById("alertMessage");
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = `alert alert-${type}`;
  alertEl.classList.remove("d-none");

  setTimeout(() => {
    alertEl.classList.add("d-none");
  }, 4000);
}