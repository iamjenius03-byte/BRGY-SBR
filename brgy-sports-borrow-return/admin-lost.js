// ===== ADMIN LOST REPORTS =====

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = 'Admin';

    const tableBody = document.getElementById('lostTableBody');
    const emptyState = document.getElementById('emptyState');

    fetch('https://brgy-sbr.online/admin-lost.php', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Lost reports:', data);

        if (!data.success || data.lost.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        tableBody.innerHTML = '';

        data.lost.forEach((item, index) => {
            const row = document.createElement('tr');

            let statusClass = 'status-lost';
            let statusDisplay = '';
            let actions = '';
            let typeDisplay = item.lost_type === 'damage' ? 'Damage' : 'Lost';

            // ===== DAMAGE FLOW =====
            if (item.lost_type === 'damage') {
                if (item.lost_status === 'reported') {
                    statusDisplay = 'Damage (Reported)';
                    statusClass = 'status-overdue';
                    actions = `<button class="confirm-btn" data-id="${item.id}" data-action="confirm-damage">Confirm Damage</button>`;
                } else if (item.lost_status === 'confirmed') {
                    if (item.penalty_paid == 0) {
                        statusDisplay = 'Damage (Pending Payment)';
                        statusClass = 'status-lost';
                        actions = `<button class="action-btn action-pay" onclick="markPaid(${item.id})">Mark as Paid</button>`;
                    } else {
                        statusDisplay = 'Damage (Paid)';
                        statusClass = 'status-returned';
                        actions = `<button class="resolve-btn" data-id="${item.id}">Resolve</button>`;
                    }
                } else if (item.lost_status === 'resolved') {
                    statusDisplay = 'Damage (Resolved)';
                    statusClass = 'status-returned';
                    actions = '';
                }
            }

            // ===== LOST FLOW =====
            if (item.lost_type === 'lost' || !item.lost_type) {
                let daysLeft = 7 - (item.days_since_report || 0);
                if (item.lost_status === 'reported') {
                    statusDisplay = daysLeft > 0 ? 'Lost (Reported - ' + daysLeft + ' days left)' : '⚠️ Ready for confirmation';
                    statusClass = 'status-overdue';
                    if (daysLeft <= 0) {
                        actions = `<button class="confirm-btn" data-id="${item.id}" data-action="confirm">Confirm Lost</button>`;
                    }
                } else if (item.lost_status === 'confirmed') {
                    if (item.penalty_paid == 0) {
                        statusDisplay = 'Lost (Unpaid - ₱' + (item.penalty_amount || 0) + ')';
                        statusClass = 'status-lost';
                        actions = `<button class="action-btn action-pay" onclick="markPaid(${item.id})">Mark as Paid</button>`;
                    } else {
                        statusDisplay = 'Lost (Paid)';
                        statusClass = 'status-returned';
                        actions = `<button class="resolve-btn" data-id="${item.id}">Resolve</button>`;
                    }
                } else if (item.lost_status === 'resolved') {
                    statusDisplay = 'Lost (Resolved)';
                    statusClass = 'status-returned';
                    actions = '';
                }
            }

            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${item.user_name || 'Unknown'}</strong></td>
                <td>${item.equipment_name || 'Unknown'}</td>
                <td>${item.lost_reported_date || '—'}</td>
                <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                <td>${actions}</td>
            `;

            tableBody.appendChild(row);
        });

        // Attach events
        document.querySelectorAll('.confirm-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const action = this.getAttribute('data-action') || 'confirm';
                const msg = action === 'confirm-damage' ? 'Confirm this damage report?' : 'Confirm this item as lost?';
                if (confirm(msg)) {
                    confirmAction(id, action, token);
                }
            });
        });

        document.querySelectorAll('.resolve-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (confirm('Mark this as resolved?')) {
                    confirmAction(id, 'resolve', token);
                }
            });
        });
    })
    .catch(error => {
        console.error('Error:', error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0392b;">Failed to load lost reports.</td></tr>';
    });

    function confirmAction(id, action, token) {
        fetch('https://brgy-sbr.online/admin-lost.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ id: id, action: action })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                location.reload();
            } else {
                alert('Failed: ' + data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }

    window.markPaid = function(id) {
        if (confirm('Mark this as paid?')) {
            confirmAction(id, 'paid', localStorage.getItem('token'));
        }
    };
});