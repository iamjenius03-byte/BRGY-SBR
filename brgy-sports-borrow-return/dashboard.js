// dashboard.js - CORRECTED

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Display user name
    document.querySelector('.name').textContent = user.name;
    document.querySelector('.role').textContent = user.role === 'admin' ? 'Admin' : 'Resident';

    // Welcome message
    const welcomeName = document.getElementById('userNameWelcome');
    if (welcomeName) {
        welcomeName.textContent = user.name;
    }

    // Fetch dashboard data
    fetch('https://brgy-sbr.online/dashboard.php', {
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Stats
            document.getElementById('activeBorrows').textContent = data.data.activeBorrows;
            document.getElementById('pendingReturns').textContent = data.data.pendingReturns;
            document.getElementById('overdueItems').textContent = data.data.overdueItems;
            document.getElementById('totalPenalty').textContent = '₱' + parseFloat(data.data.totalPenalty).toFixed(2);

            // ===== RECENT ACTIVITY =====
            const activityList = document.getElementById('recentActivity');
            if (activityList) {
                activityList.innerHTML = '';

                if (!data.data.recentActivity || data.data.recentActivity.length === 0) {
                    activityList.innerHTML = '<p class="no-activity">No recent activity yet.</p>';
                } else {
                    data.data.recentActivity.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'activity-item';

                        // Determine status and icon based on item.status
                        let statusClass = '';
                        let icon = '';
                        let displayText = '';

                        if (item.status === 'returned') {
                            statusClass = 'status-returned';
                            icon = '✅';
                            displayText = 'Returned';
                        } else if (item.status === 'borrowed') {
                            statusClass = 'status-borrowed';
                            icon = '📦';
                            displayText = 'Borrowed';
                        } else if (item.status === 'overdue') {
                            statusClass = 'status-overdue';
                            icon = '⚠️';
                            displayText = 'Overdue';
                        } else if (item.status === 'lost') {
                            statusClass = 'status-lost';
                            icon = '❌';
                            displayText = 'Lost';
                        } else {
                            statusClass = '';
                            icon = '📋';
                            displayText = item.status || '—';
                        }

                        // Format date
                        let displayDate = '—';
                        if (item.borrow_date) {
                            const d = new Date(item.borrow_date);
                            displayDate = d.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            });
                        }

                        div.innerHTML = `
                            <span class="${statusClass}">${icon} ${displayText} <strong>${item.equipment_name || 'Unknown'}</strong></span>
                            <span class="activity-date">${displayDate}</span>
                        `;
                        activityList.appendChild(div);
                    });
                }
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        const activityList = document.getElementById('recentActivity');
        if (activityList) {
            activityList.innerHTML = '<p class="no-activity" style="color: #c0392b;">Failed to load activity.</p>';
        }
    });
});