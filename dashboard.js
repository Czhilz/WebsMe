const SUPABASE_URL = 'https://ycnqeieeoleoadomziji.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ESTYAVuV59-R0FLJzVpgow_8CUukRgE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Use existing session from head script, or read from localStorage
let userSession = typeof currentUser !== 'undefined' 
    ? currentUser 
    : JSON.parse(localStorage.getItem('currentUser'));

if (!userSession) {
    window.location.href = 'index.html';
} else {
    initDashboard(userSession);
}

function initDashboard(user) {
    const fullname = user.fullname || user.username;
    const role = (user.role || 'siswa').toLowerCase();

    document.getElementById('userFullname').textContent = fullname;
    document.getElementById('welcomeName').textContent = fullname;
    document.getElementById('userRole').textContent = role;
    document.getElementById('welcomeRole').textContent = role;

    if (role === 'admin') {
        document.getElementById('viewAdmin')?.classList.remove('d-none');
        loadAdminUsers();
    } else if (role === 'guru') {
        document.getElementById('viewGuru')?.classList.remove('d-none');
    } else {
        document.getElementById('viewSiswa')?.classList.remove('d-none');
        loadStudentGrades(user.id);
    }
}

async function loadAdminUsers() {
    const tableBody = document.getElementById('adminUserTableBody');
    if (!tableBody) return;

    const { data: users, error } = await supabaseClient
        .from('users')
        .select('*')
        .order('id', { ascending: true });

    if (error || !users) {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-secondary">Gagal memuat data user.</td></tr>`;
        return;
    }

    tableBody.innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.username}</td>
            <td>${u.fullname || '-'}</td>
            <td><span class="badge bg-secondary text-capitalize">${u.role}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-warning me-1" onclick="openEditModal(${u.id}, '${u.username}', '${u.fullname || ''}', '${u.role}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${u.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

document.getElementById('formAddUser')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('addUsername').value.trim();
    const password = document.getElementById('addPassword').value;
    const fullname = document.getElementById('addFullname').value.trim();
    const role = document.getElementById('addRole').value;

    const { error } = await supabaseClient
        .from('users')
        .insert([{ username, password, fullname, role }]);

    if (error) {
        alert('Gagal menambah user: ' + error.message);
        return;
    }

    const modalEl = document.getElementById('modalAddUser');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    document.getElementById('formAddUser').reset();
    loadAdminUsers();
});

window.openEditModal = function(id, username, fullname, role) {
    document.getElementById('editUserId').value = id;
    document.getElementById('editUsername').value = username;
    document.getElementById('editFullname').value = fullname;
    document.getElementById('editRole').value = role;

    const modal = new bootstrap.Modal(document.getElementById('modalEditUser'));
    modal.show();
};

document.getElementById('formEditUser')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = document.getElementById('editUserId').value;
    const username = document.getElementById('editUsername').value.trim();
    const fullname = document.getElementById('editFullname').value.trim();
    const role = document.getElementById('editRole').value;

    const { error } = await supabaseClient
        .from('users')
        .update({ username, fullname, role })
        .eq('id', id);

    if (error) {
        alert('Gagal update user: ' + error.message);
        return;
    }

    const modalEl = document.getElementById('modalEditUser');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    loadAdminUsers();
});

window.deleteUser = async function(id) {
    if (!confirm('Yakin ingin menghapus user ini?')) return;

    const { error } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Gagal menghapus user: ' + error.message);
        return;
    }

    loadAdminUsers();
};

async function loadStudentGrades(userId) {
    const tableBody = document.getElementById('siswaNilaiBody');
    if (!tableBody) return;

    const { data: grades, error } = await supabaseClient
        .from('nilai')
        .select('*')
        .eq('user_id', userId);

    if (error || !grades || grades.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center text-secondary">Belum ada data nilai.</td></tr>`;
        return;
    }

    tableBody.innerHTML = grades.map(item => {
        const finalGrade = Math.round((item.uh + item.uts + item.uas) / 3);
        const status = finalGrade >= 75 
            ? '<span class="badge bg-success">Tuntas</span>' 
            : '<span class="badge bg-danger">Remedial</span>';

        return `
            <tr>
                <td>${item.mata_pelajaran}</td>
                <td class="fw-bold text-primary">${finalGrade}</td>
                <td>${status}</td>
            </tr>
        `;
    }).join('');
}

// Attach logout handler directly
document.addEventListener('DOMContentLoaded', function() {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        });
    }
});