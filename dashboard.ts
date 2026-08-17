// --- Global Declarations & Types ---
declare const supabase: any;
declare const bootstrap: any;

interface Window {
  supabaseClient?: any;
  supabase?: any;
  switchTab?: (tabName: string) => void;
  deleteGrade?: (id: number) => void;
  openEditModal?: (id: number | string, username: string, fullname: string, kelas: string, role: string) => void;
  deleteUser?: (id: number | string) => void;
}

interface UserProfile {
  id: number | string;
  username: string;
  fullname?: string;
  role?: string;
  kelas_id?: number | string;
  kelas?: string;
  kelas_rel?: {
    nama_kelas: string;
  };
}

interface GradeItem {
  id: number;
  user_id: number | string;
  mata_pelajaran: string;
  uh: number;
  uts: number;
  uas: number;
}

// --- Supabase Setup ---
const SUPABASE_URL = "https://ycnqeieeoleoadomziji.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljbnFlaWVlb2xlb2Fkb216aWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxOTg2MDEsImV4cCI6MjEwMTc3NDYwMX0.9PSoayzgE7PoDomvumlkJw22t6VUhqm1JvXBelvyhT4";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const client = window.supabaseClient || window.supabase;
let userSession: UserProfile | null = null;

// --- Session & Initialization ---
async function loadSession(): Promise<void> {
  const { data: { session }, error: sessionErr } = await supabaseClient.auth.getSession();

  if (sessionErr || !session) {
    console.error("No active session in localStorage:", sessionErr);
    window.location.href = "index.html";
    return;
  }

  const user = session.user;

  const { data: userSessionData, error: profileErr } = await supabaseClient
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileErr || !userSessionData) {
    console.error("Profile fetch error:", profileErr);
    alert("Profile error: " + profileErr.message);
    window.location.href = "index.html";
    return;
  }

  initDashboard(userSessionData as UserProfile);
}

loadSession();

function initDashboard(user: UserProfile): void {
  userSession = user;
  console.log("Current User Session:", userSession);

  const fullname = user.fullname || user.username;
  const role = (user.role || "siswa").toLowerCase();

  const userFullnameEl = document.getElementById("userFullname");
  const welcomeNameEl = document.getElementById("welcomeName");
  const userRoleEl = document.getElementById("userRole");
  const welcomeRoleEl = document.getElementById("welcomeRole");

  if (userFullnameEl) userFullnameEl.textContent = fullname;
  if (welcomeNameEl) welcomeNameEl.textContent = fullname;
  if (userRoleEl) userRoleEl.textContent = role;
  if (welcomeRoleEl) welcomeRoleEl.textContent = role;

  updateThemeUI();

  document
    .querySelectorAll(".role-view")
    .forEach((view) => view.classList.add("d-none"));

  if (role === "admin") {
    document.getElementById("viewAdmin")?.classList.remove("d-none");
    document.getElementById("adminPasswordSection")?.classList.remove("d-none");
    loadAdminUsers();
  } else if (role === "guru") {
    document.getElementById("viewGuru")?.classList.remove("d-none");
    populateStudentDropdown();
    loadGuruGrades();
  } else {
    document.getElementById("viewSiswa")?.classList.remove("d-none");
    loadStudentGrades(user.id);
  }
}

// --- Navigation & Tabs ---
window.switchTab = function (tabName: string): void {
  if (!userSession) return;
  const role = (userSession.role || "siswa").toLowerCase();

  document
    .querySelectorAll(".sidebar .nav-link-custom")
    .forEach((link) => link.classList.remove("active"));
  document
    .querySelectorAll(".role-view")
    .forEach((view) => view.classList.add("d-none"));

  if (tabName === "dashboard") {
    document.getElementById("navDashboard")?.classList.add("active");

    if (role === "admin") {
      document.getElementById("viewAdmin")?.classList.remove("d-none");
      switchAdminTab("dashboard");
    } else if (role === "guru") {
      document.getElementById("viewGuru")?.classList.remove("d-none");
    } else {
      document.getElementById("viewSiswa")?.classList.remove("d-none");
    }
  } else if (tabName === "transkrip") {
    document.getElementById("navTranskrip")?.classList.add("active");

    if (role === "admin") {
      document.getElementById("viewAdmin")?.classList.remove("d-none");
      switchAdminTab("transkrip");
    } else if (role === "guru") {
      document.getElementById("viewGuru")?.classList.remove("d-none");
      loadGuruGrades();
    } else {
      document.getElementById("viewSiswa")?.classList.remove("d-none");
      loadStudentGrades(userSession.id);
    }
  } else if (tabName === "pengaturan") {
    document.getElementById("navPengaturan")?.classList.add("active");
    document.getElementById("viewPengaturan")?.classList.remove("d-none");
  }
};

function switchAdminTab(tabName: string): void {
  document
    .querySelectorAll(".admin-tab")
    .forEach((tab) => tab.classList.add("d-none"));

  if (tabName === "dashboard") {
    document.getElementById("adminTabDashboard")?.classList.remove("d-none");
    loadAdminUsers();
  } else if (tabName === "transkrip") {
    document.getElementById("adminTabTranskrip")?.classList.remove("d-none");
    loadAllGrades("adminGradesTableBody");
  }
}

// --- Theme Controller ---
function updateThemeUI(): void {
  const currentTheme = document.documentElement.getAttribute("data-bs-theme") || "dark";
  const label = document.getElementById("themeLabel");
  const icon = document.getElementById("themeIcon");

  if (label && icon) {
    if (currentTheme === "dark") {
      label.textContent = "Dark Mode";
      icon.className = "bi bi-moon-stars me-1";
    } else {
      label.textContent = "Light Mode";
      icon.className = "bi bi-sun-fill me-1";
    }
  }
}

document
  .getElementById("btnToggleTheme")
  ?.addEventListener("click", function () {
    const currentTheme = document.documentElement.getAttribute("data-bs-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-bs-theme", newTheme);
    localStorage.setItem("appTheme", newTheme);
    updateThemeUI();
  });

// --- Student & Teacher Data Operations ---
async function populateStudentDropdown(): Promise<void> {
  const selectEl = document.getElementById("inputUserId") as HTMLSelectElement | null;
  if (!selectEl) return;

  let query = supabaseClient
    .from("users")
    .select("id, username, fullname, kelas_id, kelas, kelas_rel:kelas_id(nama_kelas)")
    .eq("role", "siswa")
    .order("fullname", { ascending: true });

  if (userSession?.kelas_id) {
    query = query.eq("kelas_id", userSession.kelas_id);
  }

  const { data: students, error } = await query;

  if (error || !students || students.length === 0) {
    selectEl.innerHTML = '<option value="">Tidak ada siswa di kelas ini</option>';
    return;
  }

  selectEl.innerHTML =
    '<option value="">-- Pilih Siswa --</option>' +
    students
      .map((s: UserProfile) => {
        const className = s.kelas_rel?.nama_kelas || s.kelas || "Tanpa Kelas";
        return `<option value="${s.id}">${s.fullname || s.username} (${className})</option>`;
      })
      .join("");
}

async function loadGuruGrades(): Promise<void> {
  const tableBody = document.getElementById("guruGradesTableBody");
  if (!tableBody) return;

  const { data: students } = await supabaseClient
    .from("users")
    .select("id, fullname, kelas")
    .eq("role", "siswa");

  const studentMap: Record<string | number, UserProfile> = {};
  (students || []).forEach((s: UserProfile) => {
    studentMap[s.id] = s;
  });

  const { data: grades, error } = await supabaseClient
    .from("nilai")
    .select("*")
    .order("id", { ascending: false });

  if (error || !grades || grades.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-secondary">Belum ada data nilai tersimpan.</td></tr>`;
    return;
  }

  tableBody.innerHTML = (grades as GradeItem[])
    .map((g) => {
      const student = studentMap[g.user_id] || {
        fullname: `User #${g.user_id}`,
        kelas: "-",
      };
      const avg = Math.round((g.uh + g.uts + g.uas) / 3);
      return `
        <tr>
            <td>${g.id}</td>
            <td>${student.fullname}</td>
            <td>${student.kelas || "-"}</td>
            <td>${g.mata_pelajaran}</td>
            <td>${g.uh}</td>
            <td>${g.uts}</td>
            <td>${g.uas}</td>
            <td class="fw-bold text-primary">${avg}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" onclick="deleteGrade(${g.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
      `;
    })
    .join("");
}

async function loadStudentGrades(userId: number | string): Promise<void> {
  const tableBody = document.getElementById("siswaNilaiBody");
  if (!tableBody) return;

  const { data: grades, error } = await supabaseClient
    .from("nilai")
    .select("*")
    .eq("user_id", userId);

  const avgGradeEl = document.getElementById("statAvgGrade");
  const totalSubjEl = document.getElementById("statTotalSubjects");
  const statusEl = document.getElementById("statAcademicStatus");

  if (error || !grades || grades.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary">Belum ada data nilai.</td></tr>`;
    if (avgGradeEl) avgGradeEl.textContent = "0";
    if (totalSubjEl) totalSubjEl.textContent = "0";
    if (statusEl) statusEl.textContent = "-";
    return;
  }

  let totalSum = 0;
  let totalPassed = 0;

  tableBody.innerHTML = (grades as GradeItem[])
    .map((item) => {
      const finalGrade = Math.round((item.uh + item.uts + item.uas) / 3);
      totalSum += finalGrade;

      const isPassed = finalGrade >= 75;
      if (isPassed) totalPassed++;

      const status = isPassed
        ? '<span class="badge bg-success">Tuntas</span>'
        : '<span class="badge bg-danger">Remedial</span>';

      return `
        <tr>
            <td>${item.mata_pelajaran}</td>
            <td>${item.uh}</td>
            <td>${item.uts}</td>
            <td>${item.uas}</td>
            <td class="fw-bold text-primary">${finalGrade}</td>
            <td>${status}</td>
        </tr>
      `;
    })
    .join("");

  const avgGrade = Math.round(totalSum / grades.length);
  if (avgGradeEl) avgGradeEl.textContent = avgGrade.toString();
  if (totalSubjEl) totalSubjEl.textContent = grades.length.toString();

  if (statusEl) {
    if (avgGrade >= 75 && totalPassed === grades.length) {
      statusEl.textContent = "Tuntas";
      statusEl.className = "fw-bold text-success mt-1 mb-0";
    } else {
      statusEl.textContent = "Perlu Remedial";
      statusEl.className = "fw-bold text-warning mt-1 mb-0";
    }
  }
}

window.deleteGrade = async function (id: number): Promise<void> {
  if (!confirm("Yakin ingin menghapus data nilai ini?")) return;

  const { error } = await supabaseClient.from("nilai").delete().eq("id", id);

  if (error) {
    alert("Gagal menghapus nilai: " + error.message);
    return;
  }

  const role = (userSession?.role || "siswa").toLowerCase();
  if (role === "guru") loadGuruGrades();
  else if (role === "admin") loadAllGrades("adminGradesTableBody");
};

// --- Admin Operations ---
async function loadAdminUsers(): Promise<void> {
  const tableBody = document.getElementById("adminUserTableBody");
  if (!tableBody) return;

  const { data: users, error } = await supabaseClient
    .from("users")
    .select("id, username, fullname, role, kelas_id, kelas(nama_kelas)")
    .order("id", { ascending: true });

  if (error || !users) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary">Gagal memuat data user.</td></tr>`;
    return;
  }

  tableBody.innerHTML = (users as UserProfile[])
    .map(
      (u) => `
        <tr>
            <td><span class="badge bg-dark fw-bold">${u.username}</span></td>
            <td>${u.fullname || "-"}</td>
            <td>${u.kelas_rel?.nama_kelas || "-"}</td>
            <td><span class="badge bg-secondary text-capitalize">${u.role || "-"}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-warning me-1" onclick="openEditModal('${u.id}', '${u.username}', '${u.fullname || ""}', '${u.kelas_id || ""}', '${u.role || ""}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `
    )
    .join("");
}

document
  .getElementById("formAddUser")
  ?.addEventListener("submit", async function (e: Event) {
    e.preventDefault();
    const username = (document.getElementById("addUsername") as HTMLInputElement).value.trim();
    const password = (document.getElementById("addPassword") as HTMLInputElement).value;
    const fullname = (document.getElementById("addFullname") as HTMLInputElement).value.trim();
    const kelas = (document.getElementById("addKelas") as HTMLInputElement).value.trim();
    const role = (document.getElementById("addRole") as HTMLSelectElement).value;

    const { error } = await supabaseClient
      .from("users")
      .insert([{ username, password, fullname, kelas, role }]);

    if (error) {
      alert("Gagal menambah user: " + error.message);
      return;
    }

    const modalEl = document.getElementById("modalAddUser");
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    (document.getElementById("formAddUser") as HTMLFormElement)?.reset();
    loadAdminUsers();
  });

window.openEditModal = function (
  id: number | string,
  username: string,
  fullname: string,
  kelas: string,
  role: string
): void {
  const editUserId = document.getElementById("editUserId") as HTMLInputElement | null;
  const editUsername = document.getElementById("editUsername") as HTMLInputElement | null;
  const editFullname = document.getElementById("editFullname") as HTMLInputElement | null;
  const editKelas = document.getElementById("editKelas") as HTMLInputElement | null;
  const editRole = document.getElementById("editRole") as HTMLSelectElement | null;

  if (editUserId) editUserId.value = String(id);
  if (editUsername) editUsername.value = username;
  if (editFullname) editFullname.value = fullname;
  if (editKelas) editKelas.value = kelas;
  if (editRole) editRole.value = role;

  const modalEl = document.getElementById("modalEditUser");
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
};

document
  .getElementById("formEditUser")
  ?.addEventListener("submit", async function (e: Event) {
    e.preventDefault();
    const id = (document.getElementById("editUserId") as HTMLInputElement).value;
    const username = (document.getElementById("editUsername") as HTMLInputElement).value.trim();
    const fullname = (document.getElementById("editFullname") as HTMLInputElement).value.trim();
    const kelas = (document.getElementById("editKelas") as HTMLInputElement).value.trim();
    const role = (document.getElementById("editRole") as HTMLSelectElement).value;

    const { error } = await supabaseClient
      .from("users")
      .update({ username, fullname, kelas, role })
      .eq("id", id);

    if (error) {
      alert("Gagal update user: " + error.message);
      return;
    }

    const modalEl = document.getElementById("modalEditUser");
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    loadAdminUsers();
  });

window.deleteUser = async function (id: number | string): Promise<void> {
  if (!confirm("Yakin ingin menghapus user ini?")) return;

  const { error } = await supabaseClient.from("users").delete().eq("id", id);

  if (error) {
    alert("Gagal menghapus user: " + error.message);
    return;
  }

  loadAdminUsers();
};

async function loadAllGrades(targetTableId: string): Promise<void> {
  const tableBody = document.getElementById(targetTableId);
  if (!tableBody) return;

  const { data: grades, error } = await supabaseClient
    .from("nilai")
    .select("*")
    .order("id", { ascending: true });

  if (error || !grades || grades.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-secondary">Belum ada data nilai tersimpan.</td></tr>`;
    return;
  }

  tableBody.innerHTML = (grades as GradeItem[])
    .map((g) => {
      const avg = Math.round((g.uh + g.uts + g.uas) / 3);
      return `
        <tr>
            <td>${g.id}</td>
            <td>User #${g.user_id}</td>
            <td>${g.mata_pelajaran}</td>
            <td>${g.uh}</td>
            <td>${g.uts}</td>
            <td>${g.uas}</td>
            <td class="fw-bold text-primary">${avg}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" onclick="deleteGrade(${g.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
      `;
    })
    .join("");
}

// --- Form Submissions & Listeners ---
document
  .getElementById("formInputNilai")
  ?.addEventListener("submit", async function (e: Event) {
    e.preventDefault();
    const user_id = (document.getElementById("inputUserId") as HTMLSelectElement).value;
    const mata_pelajaran = (document.getElementById("inputMapel") as HTMLInputElement).value.trim();
    const uh = parseInt((document.getElementById("inputUH") as HTMLInputElement).value, 10);
    const uts = parseInt((document.getElementById("inputUTS") as HTMLInputElement).value, 10);
    const uas = parseInt((document.getElementById("inputUAS") as HTMLInputElement).value, 10);

    if (!user_id) {
      alert("Silakan pilih siswa terlebih dahulu.");
      return;
    }

    const { error } = await supabaseClient
      .from("nilai")
      .insert([{ user_id, mata_pelajaran, uh, uts, uas }]);

    if (error) {
      alert("Gagal menyimpan nilai: " + error.message);
      return;
    }

    alert("Nilai berhasil disimpan!");
    (document.getElementById("formInputNilai") as HTMLFormElement)?.reset();
    loadGuruGrades();
  });

document
  .getElementById("formUpdatePassword")
  ?.addEventListener("submit", async function (e: Event) {
    e.preventDefault();
    if (!userSession) return;
    const newPassword = (document.getElementById("newAdminPassword") as HTMLInputElement).value;

    const { error } = await supabaseClient
      .from("users")
      .update({ password: newPassword })
      .eq("id", userSession.id);

    if (error) {
      alert("Gagal memperbarui password: " + error.message);
      return;
    }

    alert("Password berhasil diperbarui!");
    (document.getElementById("formUpdatePassword") as HTMLFormElement)?.reset();
  });

document.addEventListener("DOMContentLoaded", function () {
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", function () {
      localStorage.removeItem("currentUser");
      window.location.href = "index.html";
    });
  }
});