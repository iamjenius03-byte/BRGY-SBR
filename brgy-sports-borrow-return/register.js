// ===== REGISTER PAGE JAVASCRIPT =====

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

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const registerError = document.getElementById('registerError');
    const registerSuccess = document.getElementById('registerSuccess');

    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = document.getElementById('fullname').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            registerError.classList.remove('show');
            registerSuccess.classList.remove('show');

            if (!name || !email || !password || !confirmPassword) {
                registerError.textContent = 'Please fill in all fields.';
                registerError.classList.add('show');
                return;
            }

            if (password.length < 6) {
                registerError.textContent = 'Password must be at least 6 characters.';
                registerError.classList.add('show');
                return;
            }

            if (password !== confirmPassword) {
                registerError.textContent = 'Passwords do not match.';
                registerError.classList.add('show');
                return;
            }

            // ===== SEND TO BACKEND =====
            fetch('https://brgy-sbr.online/auth.php?action=register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    registerSuccess.textContent = data.message || 'Account created successfully!';
                    registerSuccess.classList.add('show');
                    registerForm.reset();
                } else {
                    registerError.textContent = data.message || 'Registration failed.';
                    registerError.classList.add('show');
                }
            })
            .catch(error => {
                registerError.textContent = 'Network error. Please try again.';
                registerError.classList.add('show');
                console.error('Error:', error);
            });
        });
    }
});