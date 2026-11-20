// ===== MY BORROWINGS PAGE JAVASCRIPT =====

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token) {
        window.location.href = 'login.html';
        return;
    }

    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Admin' : 'Resident';

    const tableBody = document.getElementById('borrowingsTableBody');
    const emptyState = document.getElementById('emptyState');

    if (!tableBody) {
        console.error('Table body not found!');
        return;
    }

    fetch('https://brgy-sbr.online/my-borrowings.php', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Data received:', data);

        if (!data.success) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0392b;">' + data.message + '</td></tr>';
            return;
        }

        if (data.borrows.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        tableBody.innerHTML = '';

        data.borrows.forEach(borrow => {
            const row = document.createElement('tr');

            let statusDisplay = borrow.status.charAt(0).toUpperCase() + borrow.status.slice(1);
            let statusClass = 'status-borrowed';
            let actions = '';
            let daysLeft = 0;

            // Check if lost
            if (borrow.lost_status === 'reported') {
                const reportedDate = new Date(borrow.lost_reported_date);
                const today = new Date();
                const diffTime = Math.abs(today - reportedDate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                daysLeft = 7 - diffDays;
            }

            // ===== STATUS & ACTIONS =====

// Lost - Reported (within 7 days)
if (borrow.lost_status === 'reported' && borrow.status === 'borrowed' && (borrow.lost_type === 'lost' || !borrow.lost_type)) {
    statusDisplay = 'Lost (Reported)';
    statusClass = 'status-overdue';
    actions = `<a href="return.html?borrow_id=${borrow.id}" class="action-btn action-return">Return</a>`;
    if (daysLeft > 0) {
        actions += ` <span class="days-left">(${daysLeft} days left to find)</span>`;
    } else {
        actions += ` <span class="days-left" style="color:red;">⚠️ Time expired!</span>`;
    }
}
// Damage - Reported (waiting for admin)
else if (borrow.lost_status === 'reported' && borrow.lost_type === 'damage') {
    statusDisplay = 'Damage (Reported)';
    statusClass = 'status-overdue';
    actions = `<span class="action-btn action-view">Waiting for admin</span>`;
}
// Damage - Confirmed (replacement cost applied)
else if (borrow.lost_status === 'confirmed' && borrow.lost_type === 'damage') {
    if (borrow.penalty_paid == 0) {
        statusDisplay = 'Damage (Confirmed)';
        statusClass = 'status-lost';
        actions = `<button class="action-btn action-pay" onclick="payReplacement(${borrow.id})">Pay Replacement Fee</button>`;
    } else {
        statusDisplay = 'Damage (Pending Payment)';
        statusClass = 'status-borrowed';
        actions = `<span class="action-btn action-view">Pay replacement fee</span>`;
    }
}
// Damage - Resolved
else if (borrow.lost_status === 'resolved' && borrow.lost_type === 'damage') {
    statusDisplay = 'Damage (Resolved)';
    statusClass = 'status-returned';
    actions = `<span class="action-btn action-view">Paid</span>`;
}
// Lost - Confirmed (replacement cost applied)
else if (borrow.lost_status === 'confirmed' && borrow.lost_type === 'lost') {
    if (borrow.penalty_paid == 0) {
        statusDisplay = 'Lost (Confirmed)';
        statusClass = 'status-lost';
        actions = `<button class="action-btn action-pay" onclick="payReplacement(${borrow.id})">Pay Replacement Fee</button>`;
    } else {
        statusDisplay = 'Lost (Resolved)';
        statusClass = 'status-returned';
        actions = `<span class="action-btn action-view">Paid</span>`;
    }
}
// Lost - Resolved
else if (borrow.lost_status === 'resolved' && borrow.lost_type === 'lost') {
    statusDisplay = 'Lost (Resolved)';
    statusClass = 'status-returned';
    actions = `<span class="action-btn action-view">Completed</span>`;
}
// Normal borrowed
else if (borrow.status === 'borrowed' || borrow.status === 'overdue') {
    statusDisplay = borrow.status.charAt(0).toUpperCase() + borrow.status.slice(1);
    statusClass = borrow.status === 'overdue' ? 'status-overdue' : 'status-borrowed';
    actions = `
        <a href="return.html?borrow_id=${borrow.id}" class="action-btn action-return">Return</a>
        <button class="action-btn action-report" onclick="reportLost(${borrow.id})">Report Lost</button>
        <button class="action-btn action-damage" onclick="reportDamage(${borrow.id})">Report Damage</button>
    `;
}

            row.innerHTML = `
                <td><strong>${borrow.equipment_name}</strong></td>
                <td>${borrow.borrow_date}</td>
                <td>${borrow.due_date}</td>
                <td><span class="status-badge ${statusClass}">${statusDisplay}</span></td>
                <td>${borrow.quantity}</td>
                <td>${actions}</td>
            `;

            tableBody.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Error:', error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0392b;">Failed to load borrowings.</td></tr>';
    });
});

// ===== REPORT LOST =====
function reportLost(borrowId) {
    if (confirm('Report this equipment as lost? You have 7 days to find and return it.')) {
        const token = localStorage.getItem('token');
        fetch('https://brgy-sbr.online/borrow.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ action: 'report-lost', borrow_id: borrowId })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.success) location.reload();
        })
        .catch(error => console.error('Error:', error));
    }
}

// ===== REPORT DAMAGE =====
function reportDamage(borrowId) {
    if (confirm('Report this equipment as damaged? Replacement cost will be applied.')) {
        const token = localStorage.getItem('token');
        fetch('https://brgy-sbr.online/borrow.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ action: 'report-damage', borrow_id: borrowId })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.success) location.reload();
        })
        .catch(error => console.error('Error:', error));
    }
}

// ===== PAY REPLACEMENT =====
function payReplacement(borrowId) {
    if (confirm('Pay replacement fee?')) {
        const token = localStorage.getItem('token');
        fetch('https://brgy-sbr.online/borrow.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ action: 'pay-replacement', borrow_id: borrowId })
        })
        .then(response => response.json())
        .then(data => {
            alert(data.message);
            if (data.success) location.reload();
        })
        .catch(error => console.error('Error:', error));
    }
}