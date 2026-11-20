// ===== ADMIN USERS =====

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    console.log('User:', user);
    console.log('Token:', token);

    if (!user || !token || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = 'Admin';

    const tableBody = document.getElementById('userTableBody');
    const emptyState = document.getElementById('emptyState');

    // ===== FETCH USERS =====
    fetch('https://brgy-sbr.online/admin-users.php', {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        return response.text();
    })
    .then(text => {
        console.log('Raw response:', text);
        try {
            const data = JSON.parse(text);
            console.log('Users data:', data);

            if (!data.success || data.users.length === 0) {
                tableBody.innerHTML = '';
                if (emptyState) emptyState.style.display = 'block';
                return;
            }

            if (emptyState) emptyState.style.display = 'none';
            tableBody.innerHTML = '';

           data.users.forEach((item, index) => {
    // Skip admin users
    if (item.role === 'admin') return;
    
               
                const row = document.createElement('tr');

                let statusClass = item.is_banned == 1 ? 'status-overdue' : 'status-returned';
                let statusText = item.is_banned == 1 ? 'Banned' : 'Active';

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${item.name}</strong></td>
                    <td>${item.email}</td>
                    <td>${item.role}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>                     
                    <td>${item.warning_count || 0}</td>
                    <td>
                        ${item.role !== 'admin' ? 
                            (item.is_banned == 1 ? 
                                `<button class="unban-btn" data-id="${item.id}">Unban</button>` : 
                                `<button class="ban-btn" data-id="${item.id}">Ban</button>`
                            ) : 
                            '<span class="action-btn action-view">—</span>'
                        }
                    </td>
                `;

                tableBody.appendChild(row);
            });

            // ===== BAN/UNBAN EVENTS =====
            document.querySelectorAll('.ban-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    if (confirm('Ban this user?')) {
                        updateUserStatus(id, 1, token);
                    }
                });
            });

            document.querySelectorAll('.unban-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    if (confirm('Unban this user?')) {
                        updateUserStatus(id, 0, token);
                    }
                });
            });

        } catch (e) {
            console.error('JSON parse error:', e);
            console.error('Raw text:', text);
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0392b;">Error parsing response.</td></tr>';
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0392b;">Failed to load users: ' + error.message + '</td></tr>';
    });

    // ===== UPDATE USER STATUS =====
    function updateUserStatus(id, status, token) {
        fetch('https://brgy-sbr.online/admin-users.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ id: id, is_banned: status })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('User updated successfully');
                location.reload();
            } else {
                alert('Failed to update user');
            }
        })
        .catch(error => console.error('Error:', error));
    }
});