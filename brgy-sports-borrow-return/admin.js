// ===== ADMIN DASHBOARD =====
document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    console.log('User:', user);
    console.log('Token:', token);

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    if (user.role !== 'admin') {
        window.location.href = 'dashboard.html';
        return;
    }

    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');

    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = 'Admin';

    // ===== FETCH WITH TOKEN (EXPLICIT) =====
    fetch('https://brgy-sbr.online/admin.php', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        return response.json();
    })
    .then(result => {
        console.log('Admin API Response:', result);

        if (!result.success) {
            console.error('Error:', result.message);
            return;
        }

        const data = result.data;

        document.getElementById('totalEquipment').textContent = data.totalEquipment || 0;
        document.getElementById('activeBorrows').textContent = data.activeBorrows || 0;
        document.getElementById('overdueItems').textContent = data.overdueItems || 0;
        document.getElementById('bannedUsers').textContent = data.bannedUsers || 0;

        const tableBody = document.getElementById('recentBorrows');
        if (tableBody) {
            tableBody.innerHTML = '';

            if (!data.recentBorrows || data.recentBorrows.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;padding:1rem;">No recent borrows.</td></tr>';
                return;
            }

            data.recentBorrows.forEach(borrow => {
                const row = document.createElement('tr');

                let statusClass = 'status-borrowed';
                if (borrow.status === 'overdue') statusClass = 'status-overdue';
                if (borrow.status === 'returned') statusClass = 'status-returned';
                if (borrow.status === 'lost') statusClass = 'status-lost';

                row.innerHTML = `
                    <td><strong>${borrow.user_name || 'Unknown'}</strong></td>
                    <td>${borrow.equipment_name || 'Unknown'}</td>
                    <td>${borrow.borrow_date || '—'}</td>
                    <td>${borrow.due_date || '—'}</td>
                    <td><span class="status-badge ${statusClass}">${borrow.status ? borrow.status.charAt(0).toUpperCase() + borrow.status.slice(1) : '—'}</span></td>
                    <td><a href="admin-borrows.html" class="action-btn view">View</a></td>
                `;

                tableBody.appendChild(row);
            });
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
});