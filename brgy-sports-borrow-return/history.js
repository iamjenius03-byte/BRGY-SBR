// ===== HISTORY PAGE JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    console.log('User:', user);
    console.log('Token:', token);

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = user.role === 'admin' ? 'Admin' : 'Resident';

    const tableBody = document.getElementById('historyTableBody');
    const emptyState = document.getElementById('emptyState');

    fetch('https://brgy-sbr.online/history.php', {
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
            console.log('History data:', data);

            if (!data.success || data.history.length === 0) {
                tableBody.innerHTML = '';
                emptyState.style.display = 'block';
                return;
            }

            emptyState.style.display = 'none';
            tableBody.innerHTML = '';

            data.history.forEach(item => {
                const row = document.createElement('tr');

               // Status display
let statusDisplay = '—';
if (item.type === 'borrow') {
    statusDisplay = 'Borrowed';
} else if (item.type === 'return') {
    statusDisplay = 'Returned';
} else if (item.type === 'report') {
    statusDisplay = item.status || 'Reported';
} else if (item.type === 'penalty') {
    statusDisplay = item.paid_status == 1 ? 'Paid' : 'Unpaid';
} else if (item.status) {
    statusDisplay = item.status.charAt(0).toUpperCase() + item.status.slice(1);
}
                // ===== DEFINE AMOUNT DISPLAY =====
                let amountDisplay = '—';
                if (item.amount && item.amount > 0) {
                    amountDisplay = '₱' + parseFloat(item.amount).toFixed(2);
                }

                row.innerHTML = `
                    <td><strong>${item.description || item.equipment_name || '—'}</strong></td>
                    <td>${item.borrow_date || item.date || '—'}</td>
                    <td>${item.due_date || '—'}</td>
                    <td>${item.return_date || '—'}</td>
                    <td><span class="status-badge">${statusDisplay}</span></td>
                    <td>${amountDisplay}</td>
                    <td>${item.purpose || '—'}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (e) {
            console.error('JSON parse error:', e);
            console.error('Raw text:', text);
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#c0392b;">Error parsing response.</td></tr>';
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#c0392b;">Failed to load history: ' + error.message + '</td></tr>';
    });
});