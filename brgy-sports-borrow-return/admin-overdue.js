// ===== ADMIN OVERDUE REPORTS =====

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = 'Admin';

    const tableBody = document.getElementById('overdueTableBody');
    const emptyState = document.getElementById('emptyState');

    fetch('https://brgy-sbr.online/admin-overdue.php', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Overdue data:', data);

        if (!data.success || data.overdue.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        tableBody.innerHTML = '';

        data.overdue.forEach((item, index) => {
            const row = document.createElement('tr');

            let rowClass = '';
            if (item.days_overdue >= 30) rowClass = 'danger-row';
            else if (item.days_overdue >= 14) rowClass = 'warning-row';

            row.className = rowClass;

            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${item.user_name}</strong></td>
                <td>${item.equipment_name}</td>
                <td>${item.borrow_date}</td>
                <td>${item.due_date}</td>
                <td><span class="days-badge ${item.days_overdue >= 30 ? 'days-danger' : item.days_overdue >= 14 ? 'days-warning' : 'days-info'}">${item.days_overdue} days</span></td>
                <td>₱${parseFloat(item.penalty).toFixed(2)}</td>
                <td>
                    <button class="view-btn" onclick="alert('View overdue ID: ${item.id}')">View</button>
                    <button class="remind-btn" onclick="alert('Reminder sent to ${item.user_name}')">Send Reminder</button>
                </td>
            `;

            tableBody.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error:', error);
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#c0392b;">Failed to load overdue items.</td></tr>';
    });
});