const SUPABASE_URL = "https://ycnqeieeoleoadomziji.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ESTYAVuV59-R0FLJzVpgow_8CUukRgE";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Change 'supabaseClient' if your main client variable in script.js has a different name (e.g., just 'supabase')
const client = window.supabaseClient || window.supabase;

async function loadSession() {
  // Wait briefly for Supabase to restore session from storage
  await new Promise((resolve) => setTimeout(resolve, 200));

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError || !user) {
    console.error("Auth session missing:", authError);
    window.location.href = "index.html";
    return;
  }

  const { data: userSessionData, error: profileErr } = await client
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileErr || !userSessionData) {
    console.error("Profile fetch failed:", profileErr);
    alert(
      "Gagal memuat profil: " +
        (profileErr?.message || "User tidak ditemukan di database"),
    );
    window.location.href = "index.html";
    return;
  }

  initDashboard(userSessionData);
}

// Run session loader on page load
loadSession();
// Global reference so switchTab can read user session details

let userSession = null;

function initDashboard(user) {
  userSession = user;
  console.log("Current User Session:", userSession);

  const fullname = user.fullname || user.username;
  const role = (user.role || "siswa").toLowerCase();

  document.getElementById("userFullname").textContent = fullname;
  document.getElementById("welcomeName").textContent = fullname;
  document.getElementById("userRole").textContent = role;
  document.getElementById("welcomeRole").textContent = role;

  updateThemeUI();

  // Hide all views first to prevent overlap
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

window.switchTab = function (tabName) {
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

function switchAdminTab(tabName) {
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

function updateThemeUI() {
  const currentTheme =
    document.documentElement.getAttribute("data-bs-theme") || "dark";
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
    const currentTheme =
      document.documentElement.getAttribute("data-bs-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute("data-bs-theme", newTheme);
    localStorage.setItem("appTheme", newTheme);
    updateThemeUI();
  });

// Populate dropdown list of students for Guru input form
async function populateStudentDropdown() {
  const selectEl = document.getElementById("inputUserId");
  if (!selectEl) return;

  const { data: students, error } = await supabaseClient
    .from("users")
    .select("id, username, fullname, kelas")
    .eq("role", "siswa")
    .order("fullname", { ascending: true });

  if (error || !students || students.length === 0) {
    selectEl.innerHTML = '<option value="">Belum ada data siswa</option>';
    return;
  }

  selectEl.innerHTML =
    '<option value="">-- Pilih Siswa --</option>' +
    students
      .map(
        (s) => `
            <option value="${s.id}">${s.fullname || s.username} (${s.kelas || "Tanpa Kelas"})</option>
        `,
      )
      .join("");
}

// Load grade list for Guru with mapped Student Names & Class
async function loadGuruGrades() {
  const tableBody = document.getElementById("guruGradesTableBody");
  if (!tableBody) return;

  const { data: students } = await supabaseClient
    .from("users")
    .select("id, fullname, kelas")
    .eq("role", "siswa");

  const studentMap = {};
  (students || []).forEach((s) => {
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

  tableBody.innerHTML = grades
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
                <td>${student.kelas}</td>
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

// Load personal grades and compute summary metrics for Siswa
async function loadStudentGrades(userId) {
  const tableBody = document.getElementById("siswaNilaiBody");
  if (!tableBody) return;

  const { data: grades, error } = await supabaseClient
    .from("nilai")
    .select("*")
    .eq("user_id", userId);

  if (error || !grades || grades.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-secondary">Belum ada data nilai.</td></tr>`;
    document.getElementById("statAvgGrade").textContent = "0";
    document.getElementById("statTotalSubjects").textContent = "0";
    document.getElementById("statAcademicStatus").textContent = "-";
    return;
  }

  let totalSum = 0;
  let totalPassed = 0;

  tableBody.innerHTML = grades
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
  document.getElementById("statAvgGrade").textContent = avgGrade;
  document.getElementById("statTotalSubjects").textContent = grades.length;

  const statusEl = document.getElementById("statAcademicStatus");
  if (avgGrade >= 75 && totalPassed === grades.length) {
    statusEl.textContent = "Tuntas";
    statusEl.className = "fw-bold text-success mt-1 mb-0";
  } else {
    statusEl.textContent = "Perlu Remedial";
    statusEl.className = "fw-bold text-warning mt-1 mb-0";
  }
}

// Delete Grade (Guru & Admin)
window.deleteGrade = async function (id) {
  if (!confirm("Yakin ingin menghapus data nilai ini?")) return;

  const { error } = await supabaseClient.from("nilai").delete().eq("id", id);

  if (error) {
    alert("Gagal menghapus nilai: " + error.message);
    return;
  }

  const role = (userSession.role || "siswa").toLowerCase();
  if (role === "guru") loadGuruGrades();
  else if (role === "admin") loadAllGrades("adminGradesTableBody");
};

async function loadAdminUsers() {
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

  tableBody.innerHTML = users
    .map(
      (u) => `
        <tr>
            <td><span class="badge bg-dark fw-bold">${u.username}</span></td>
            <td>${u.fullname || "-"}</td>
            <td>${u.kelas?.nama_kelas || "-"}</td>
            <td><span class="badge bg-secondary text-capitalize">${u.role}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-warning me-1" onclick="openEditModal(${u.id}, '${u.username}', '${u.fullname || ""}', '${u.kelas_id || ""}', '${u.role}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `,
    )
    .join("");
}

document
  .getElementById("formAddUser")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = document.getElementById("addUsername").value.trim();
    const password = document.getElementById("addPassword").value;
    const fullname = document.getElementById("addFullname").value.trim();
    const kelas = document.getElementById("addKelas").value.trim();
    const role = document.getElementById("addRole").value;

    const { error } = await supabaseClient
      .from("users")
      .insert([{ username, password, fullname, kelas, role }]);

    if (error) {
      alert("Gagal menambah user: " + error.message);
      return;
    }

    const modalEl = document.getElementById("modalAddUser");
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    document.getElementById("formAddUser").reset();
    loadAdminUsers();
  });

window.openEditModal = function (id, username, fullname, kelas, role) {
  document.getElementById("editUserId").value = id;
  document.getElementById("editUsername").value = username;
  document.getElementById("editFullname").value = fullname;
  document.getElementById("editKelas").value = kelas;
  document.getElementById("editRole").value = role;

  const modal = new bootstrap.Modal(document.getElementById("modalEditUser"));
  modal.show();
};

document
  .getElementById("formEditUser")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const id = document.getElementById("editUserId").value;
    const username = document.getElementById("editUsername").value.trim();
    const fullname = document.getElementById("editFullname").value.trim();
    const kelas = document.getElementById("editKelas").value.trim();
    const role = document.getElementById("editRole").value;

    const { error } = await supabaseClient
      .from("users")
      .update({ username, fullname, kelas, role })
      .eq("id", id);

    if (error) {
      alert("Gagal update user: " + error.message);
      return;
    }

    const modalEl = document.getElementById("modalEditUser");
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    loadAdminUsers();
  });

window.deleteUser = async function (id) {
  if (!confirm("Yakin ingin menghapus user ini?")) return;

  const { error } = await supabaseClient.from("users").delete().eq("id", id);

  if (error) {
    alert("Gagal menghapus user: " + error.message);
    return;
  }

  loadAdminUsers();
};

async function loadAllGrades(targetTableId) {
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

  tableBody.innerHTML = grades
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

async function populateStudentDropdown() {
  const selectEl = document.getElementById("inputUserId");
  if (!selectEl) return;

  let query = supabaseClient
    .from("users")
    .select(
      "id, username, fullname, kelas_id, kelas, kelas_rel:kelas_id(nama_kelas)",
    )
    .eq("role", "siswa")
    .order("fullname", { ascending: true });

  if (userSession.kelas_id) {
    query = query.eq("kelas_id", userSession.kelas_id);
  }

  const { data: students, error } = await query;

  if (error || !students || students.length === 0) {
    selectEl.innerHTML =
      '<option value="">Tidak ada siswa di kelas ini</option>';
    return;
  }

  selectEl.innerHTML =
    '<option value="">-- Pilih Siswa --</option>' +
    students
      .map((s) => {
        // Priority: Relational object -> String column -> Fallback
        const className = s.kelas_rel?.nama_kelas || s.kelas || "Tanpa Kelas";
        return `<option value="${s.id}">${s.fullname || s.username} (${className})</option>`;
      })
      .join("");
}

document
  .getElementById("formInputNilai")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const user_id = document.getElementById("inputUserId").value;
    const mata_pelajaran = document.getElementById("inputMapel").value.trim();
    const uh = parseInt(document.getElementById("inputUH").value);
    const uts = parseInt(document.getElementById("inputUTS").value);
    const uas = parseInt(document.getElementById("inputUAS").value);

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
    document.getElementById("formInputNilai").reset();
    loadGuruGrades();
  });

document
  .getElementById("formUpdatePassword")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();
    const newPassword = document.getElementById("newAdminPassword").value;

    const { error } = await supabaseClient
      .from("users")
      .update({ password: newPassword })
      .eq("id", userSession.id);

    if (error) {
      alert("Gagal memperbarui password: " + error.message);
      return;
    }

    alert("Password berhasil diperbarui!");
    document.getElementById("formUpdatePassword").reset();
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
