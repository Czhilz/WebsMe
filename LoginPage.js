const SUPABASE_URL = 'https://ycnqeieeoleoadomziji.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ESTYAVuV59-R0FLJzVpgow_8CUukRgE';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value;

    if (!usernameInput || !passwordInput) {
        showAlert('Username dan password harus diisi!', 'danger');
        return;
    }

    const { data: user, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('username', usernameInput)
        .eq('password', passwordInput)
        .maybeSingle();

    if (error) {
        showAlert('Terjadi kesalahan pada sistem.', 'danger');
        return;
    }

    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        showAlert('Login berhasil! Selamat datang ' + (user.fullname || user.username), 'success');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    } else {
        showAlert('NISN/NIP atau Password salah!', 'danger');
    }
});

function showAlert(message, type) {
    const alertEl = document.getElementById('alertMessage');
    alertEl.textContent = message;
    alertEl.className = `alert alert-${type}`;
    alertEl.classList.remove('d-none');
    
    setTimeout(() => {
        alertEl.classList.add('d-none');
    }, 4000);
}