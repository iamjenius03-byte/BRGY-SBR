// ===== TOGGLE PASSWORD VISIBILITY =====
function togglePasswordVisibility(inputId, buttonElement) {
    const input = document.getElementById(inputId);
    const icon = buttonElement.querySelector('i');

    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// ===== LOGIN FORM =====
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            errorMessage.classList.remove('show');

            if (!email || !password) {
                errorMessage.textContent = 'Please fill in all fields.';
                errorMessage.classList.add('show');
                return;
            }

            fetch('https://brgy-sbr.online/auth.php?action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));

                    if (data.user.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    errorMessage.textContent = data.message || 'Login failed.';
                    errorMessage.classList.add('show');
                }
            })
            .catch(error => {
                errorMessage.textContent = 'Network error. Please try again.';
                errorMessage.classList.add('show');
                console.error('Error:', error);
            });
        });
    }
});