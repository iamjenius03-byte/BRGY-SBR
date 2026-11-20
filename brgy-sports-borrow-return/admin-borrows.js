// ===== ADMIN BORROW RECORDS =====

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = 'Admin';

    const tableBody = document.getElementById('borrowTableBody');
    const emptyState = document.getElementById('emptyState');

    // ===== FETCH BORROW RECORDS =====
    fetch('https://brgy-sbr.online/admin-borrows.php', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Borrow records:', data);

        if (!data.success || data.borrows.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        tableBody.innerHTML = '';

        data.borrows.forEach((item, index) => {
            const row = document.createElement('tr');

            let statusClass = 'status-borrowed';
            if (item.status === 'overdue') statusClass = 'status-overdue';
            if (item.status === 'returned') statusClass = 'status-returned';
            if (item.status === 'lost') statusClass = 'status-lost';

            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${item.user_name || 'Unknown'}</strong></td>
                <td>${item.equipment_name || 'Unknown'}</td>
                <td>${item.borrow_date || '—'}</td>
                <td>${item.due_date || '—'}</td>
                <td><span class="status-badge ${statusClass}">${item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : '—'}</span></td>
                <td
                    <button class="edit-status-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                </td>
            `;

            tableBody.appendChild(row);
        });

        // Attach events

        document.querySelectorAll('.edit-status-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const newStatus = prompt('Enter new status (borrowed, overdue, returned, lost):');
                if (newStatus) {
                    updateBorrowStatus(id, newStatus, token);
                }
            });
        });
    })
    .catch(error => {
        console.error('Error:', error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#c0392b;">Failed to load borrow records.</td></tr>';
    });

    // ===== UPDATE BORROW STATUS =====
    function updateBorrowStatus(id, status, token) {
        fetch('https://brgy-sbr.online/admin-borrows.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ id, status })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Status updated successfully');
                location.reload();
            } else {
                alert('Failed to update status');
            }
        })
        .catch(error => console.error('Error:', error));
    }
});