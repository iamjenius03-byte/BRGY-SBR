// ===== ADMIN LOGIN (Fixed Credentials) =====
document.addEventListener('DOMContentLoaded', function() {
    const adminForm = document.getElementById('adminLoginForm');
    const errorMessage = document.getElementById('errorMessage');

    const FIXED_EMAIL = 'admin@barangay.com';
    const FIXED_PASSWORD = 'password123';

    if (adminForm) {
        adminForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('adminEmail').value.trim();
            const password = document.getElementById('adminPassword').value.trim();

            errorMessage.classList.remove('show');

            if (!email || !password) {
                errorMessage.textContent = 'Please fill in all fields.';
                errorMessage.classList.add('show');
                return;
            }

            if (email === FIXED_EMAIL && password === FIXED_PASSWORD) {
             
                const adminUser = {
                    id: 999,
                    name: 'Admin',
                    email: FIXED_EMAIL,
                    role: 'admin'
                };

               
                const token = btoa(JSON.stringify(adminUser));

                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(adminUser));

                console.log('Token saved:', token);

                window.location.href = 'admin.html';
            } else {
                errorMessage.textContent = 'Invalid admin credentials.';
                errorMessage.classList.add('show');
            }
        });
    }
});