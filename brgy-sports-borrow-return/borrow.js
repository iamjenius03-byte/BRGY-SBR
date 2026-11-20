// ===== BORROW PAGE JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function() {
    // ===== DISPLAY USER INFO =====
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (user) {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userRole').textContent = user.role === 'admin' ? 'Admin' : 'Resident';
    } else {
        window.location.href = 'login.html';
        return;
    }

    console.log('Borrow page loaded!');

    const borrowForm = document.getElementById('borrowForm');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');
    const dueDateInput = document.getElementById('dueDate');

    // ===== AUTO-COMPUTE DUE DATE (7 days from today) =====
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dueDate = new Date(today);
    dueDate.setDate(today.getDate() + 7);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Set hidden due date
    if (dueDateInput) {
        dueDateInput.value = dueDateStr;
        console.log('Due date set to:', dueDateStr);
    }

    if (borrowForm) {
        borrowForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const equipment = document.getElementById('equipment').value;
            const quantity = document.getElementById('quantity').value;
            const purpose = document.getElementById('purpose').value.trim();

            successMessage.classList.remove('show');
            errorMessage.classList.remove('show');

            console.log('Equipment:', equipment);
            console.log('Quantity:', quantity);
            console.log('Due Date:', dueDateStr);
            console.log('Purpose:', purpose);

            if (!equipment) {
                errorMessage.textContent = 'Please select an equipment.';
                errorMessage.classList.add('show');
                return;
            }

            if (!quantity || quantity < 1) {
                errorMessage.textContent = 'Please enter a valid quantity (at least 1).';
                errorMessage.classList.add('show');
                return;
            }

            if (!purpose) {
                errorMessage.textContent = 'Please enter the purpose of borrowing.';
                errorMessage.classList.add('show');
                return;
            }

            console.log('🎉 Sending borrow request...');

            // ===== SEND TO BACKEND =====
            fetch('https://brgy-sbr.online/borrow.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    action: 'borrow',
                    equipment_id: equipment,
                    quantity: quantity,
                    due_date: dueDateStr,
                    purpose: purpose
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    successMessage.textContent = data.message || '✅ Borrow request submitted successfully!';
                    successMessage.classList.add('show');

                    setTimeout(() => {
                        window.location.href = 'my-borrowings.html';
                    }, 1500);
                } else {
                    errorMessage.textContent = data.message || 'Borrow failed. Please try again.';
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