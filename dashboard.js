// Initialize Supabase Client
const SUPABASE_URL = 'https://ycnqeieeoleoadomziji.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ESTYAVuV59-R0FLJzVpgow_8CUukRgE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const fullname = currentUser.fullname || currentUser.username;
const role = (currentUser.role || 'siswa').toLowerCase();

document.getElementById('userFullname').textContent = fullname;
document.getElementById('welcomeName').textContent = fullname;
document.getElementById('userRole').textContent = role;
document.getElementById('welcomeRole').textContent = role;

if (role === 'admin') {
    document.getElementById('viewAdmin').classList.remove('d-none');
} else if (role === 'guru') {
    document.getElementById('viewGuru').classList.remove('d-none');
} else {
    document.getElementById('viewSiswa').classList.remove('d-none');
    loadStudentGrades(currentUser.id);
}

// Fetch grades from Supabase for logged-in student
async function loadStudentGrades(userId) {
    const tableBody = document.getElementById('siswaNilaiBody');
    
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

// Logout Handler
document.getElementById('btnLogout').addEventListener('click', function() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
});