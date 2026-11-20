// ===== RETURN PAGE JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = user.role === 'admin' ? 'Admin' : 'Resident';

    const tableBody = document.getElementById('returnTableBody');
    const emptyState = document.getElementById('emptyState');
    const penaltyBox = document.getElementById('penaltyBox');
    const penaltyAmount = document.getElementById('penaltyAmount');
    const returnBtn = document.getElementById('returnBtn');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');

    fetch('https://brgy-sbr.online/return.php', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success || data.borrows.length === 0) {
            tableBody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        tableBody.innerHTML = '';

        data.borrows.forEach(borrow => {
            const row = document.createElement('tr');

            // ===== STATUS DISPLAY =====
            let statusDisplay = borrow.status.charAt(0).toUpperCase() + borrow.status.slice(1);
            let statusClass = 'status-borrowed';

            if (borrow.lost_status === 'reported') {
                statusDisplay = 'Lost (Reported)';
                statusClass = 'status-overdue';
            } else if (borrow.lost_status === 'confirmed' && borrow.lost_type === 'damage') {
                statusDisplay = 'Damage (Reported)';
                statusClass = 'status-lost';
            } else if (borrow.lost_status === 'confirmed' && borrow.lost_type === 'lost') {
                statusDisplay = 'Lost (Confirmed)';
                statusClass = 'status-lost';
            } else if (borrow.lost_status === 'resolved') {
                statusDisplay = borrow.lost_type === 'damage' ? 'Damage (Resolved)' : 'Lost (Resolved)';
                statusClass = 'status-returned';
            } else {
                if (borrow.status === 'overdue') statusClass = 'status-overdue';
                if (borrow.status === 'returned') statusClass = 'status-returned';
                if (borrow.status === 'lost') statusClass = 'status-lost';
                statusDisplay = borrow.status.charAt(0).toUpperCase() + borrow.status.slice(1);
            }

            // Check if there's a pending return request
            const isPending = borrow.return_status === 'pending';
            if (isPending) {
                statusDisplay = 'Return Pending';
                statusClass = 'status-overdue';
            }

            const disabled = isPending ? 'disabled' : '';

            row.innerHTML = `
                <td>
                    <input type="checkbox" class="return-checkbox" data-id="${borrow.id}" data-due="${borrow.due_date}" data-equipment="${borrow.equipment_name}" ${disabled} />
                </td>
                <td><strong>${borrow.equipment_name}</strong></td>
                <td>${borrow.borrow_date}</td>
                <td>${borrow.due_date}</td>
                <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                <td>${borrow.quantity}</td>
            `;

            tableBody.appendChild(row);
        });

        const checkboxes = document.querySelectorAll('.return-checkbox:not([disabled])');
        checkboxes.forEach(cb => cb.addEventListener('change', updatePenalty));

        function updatePenalty() {
            const checked = document.querySelectorAll('.return-checkbox:checked');
            let totalPenalty = 0;

            checked.forEach(cb => {
                const dueDate = cb.getAttribute('data-due');
                const today = new Date();
                const due = new Date(dueDate);

                if (today > due) {
                    const daysOverdue = Math.floor((today - due) / (1000 * 60 * 60 * 24));
                    totalPenalty += daysOverdue * 5;
                }
            });

            if (checked.length > 0) {
                penaltyAmount.textContent = '₱' + totalPenalty.toFixed(2);
                penaltyBox.classList.add('show');
                returnBtn.disabled = false;
            } else {
                penaltyBox.classList.remove('show');
                returnBtn.disabled = true;
            }
        }

        returnBtn.addEventListener('click', function() {
            const checked = document.querySelectorAll('.return-checkbox:checked');
            const borrowIds = [];

            checked.forEach(cb => {
                borrowIds.push(parseInt(cb.getAttribute('data-id')));
            });

            if (borrowIds.length === 0) {
                errorMessage.textContent = 'Please select at least one equipment to return.';
                errorMessage.classList.add('show');
                return;
            }

            errorMessage.classList.remove('show');
            successMessage.classList.remove('show');

            fetch('https://brgy-sbr.online/return.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ borrow_ids: borrowIds })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    successMessage.textContent = data.message || 'Return request submitted. Waiting for admin confirmation.';
                    successMessage.classList.add('show');

                    checked.forEach(cb => {
                        cb.disabled = true;
                        cb.closest('tr').style.opacity = '0.6';
                    });
                    returnBtn.disabled = true;
                    penaltyBox.classList.remove('show');

                    setTimeout(() => location.reload(), 2000);
                } else {
                    errorMessage.textContent = data.message || 'Return request failed.';
                    errorMessage.classList.add('show');
                }
            })
            .catch(error => {
                errorMessage.textContent = 'Network error. Please try again.';
                errorMessage.classList.add('show');
                console.error('Error:', error);
            });
        });
    })
    .catch(error => {
        console.error('Error:', error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0392b;">Failed to load borrowings.</td></tr>';
    });
});