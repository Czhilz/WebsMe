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
}

document.getElementById('btnLogout').addEventListener('click', function() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
});