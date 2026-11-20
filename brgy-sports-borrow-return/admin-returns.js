// ===== ADMIN RETURNS =====

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = 'Admin';

    const tableBody = document.getElementById('returnTableBody');
    const emptyState = document.getElementById('emptyState');

    // ===== FETCH RETURNS =====
    fetch('https://brgy-sbr.online/admin-returns.php', {
        headers: {
            'Authorization': 'Bearer ' + token
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
        console.log('Response text:', text);
        try {
            const data = JSON.parse(text);
            console.log('Returns data:', data);

            if (!data.success || data.returns.length === 0) {
                tableBody.innerHTML = '';
                if (emptyState) emptyState.style.display = 'block';
                return;
            }

            if (emptyState) emptyState.style.display = 'none';
            tableBody.innerHTML = '';

            data.returns.forEach((item, index) => {
                const row = document.createElement('tr');

                let statusClass = 'status-returned';
                let statusDisplay = item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : '—';
                let actions = '';

                if (item.status === 'pending') {
                    statusClass = 'status-overdue';
                    statusDisplay = 'Pending';
                    actions = `
                        <button class="confirm-btn" data-id="${item.id}">✅ Confirm Return</button>
                        <button class="not-returned-btn" data-id="${item.id}">❌ Did Not Return</button>
                    `;
                } else if (item.status === 'completed') {
                    statusClass = 'status-returned';
                    statusDisplay = 'Completed';
                    actions = `<span class="action-btn action-view">✅ Done</span>`;
                } else if (item.status === 'not_returned') {
                    statusClass = 'status-lost';
                    statusDisplay = 'Not Returned';
                    actions = `<span class="action-btn action-view">❌</span>`;
                } else if (item.status === 'penalty_unpaid') {
                    statusClass = 'status-overdue';
                    statusDisplay = 'Penalty Unpaid';
                    actions = `<button class="pay-btn" data-id="${item.id}">💰 Pay Penalty</button>`;
                }

                const lateFeeDisplay = item.late_fee && item.late_fee > 0 ? '₱' + parseFloat(item.late_fee).toFixed(2) : '—';

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${item.user_name || 'Unknown'}</strong></td>
                    <td>${item.equipment_name || 'Unknown'}</td>
                    <td>${item.return_date || '—'}</td>
                    <td>${lateFeeDisplay}</td>
                    <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                    <td>${actions}</td>
                `;

                tableBody.appendChild(row);
            });

            // ===== CONFIRM RETURN =====
            document.querySelectorAll('.confirm-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    if (confirm('Confirm this return? This will update the equipment quantity.')) {
                        processReturn(id, 'confirm', token);
                    }
                });
            });

            // ===== DID NOT RETURN =====
            document.querySelectorAll('.not-returned-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    if (confirm('Mark as not returned? This will keep the borrow active.')) {
                        processReturn(id, 'not_returned', token);
                    }
                });
            });

            // ===== PAY PENALTY =====
            document.querySelectorAll('.pay-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.getAttribute('data-id');
                    if (confirm('Mark penalty as paid?')) {
                        processReturn(id, 'pay_penalty', token);
                    }
                });
            });

        } catch (e) {
            console.error('JSON parse error:', e);
            console.error('Raw response:', text);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#c0392b;">Error parsing response.</td></tr>';
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#c0392b;">Failed to load returns: ' + error.message + '</td></tr>';
    });

    // ===== PROCESS RETURN (confirm, not_returned, pay_penalty) =====
    function processReturn(id, action, token) {
        fetch('https://brgy-sbr.online/admin-returns.php', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ id: id, action: action })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message || 'Action completed successfully.');
                location.reload();
            } else {
                alert('Failed: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Network error. Please try again.');
        });
    }
});