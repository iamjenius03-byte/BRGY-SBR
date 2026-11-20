// ===== ADMIN EQUIPMENT =====

document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (!user || !token || user.role !== 'admin') {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = 'Admin';

    const tableBody = document.getElementById('equipmentTableBody');
    const emptyState = document.getElementById('emptyState');

    // ===== FETCH EQUIPMENT =====
    fetch('https://brgy-sbr.online/admin-equipment.php', {
        headers: {
            'Authorization': 'Bearer ' + token
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Equipment data:', data);

        if (!data.success || data.equipment.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        tableBody.innerHTML = '';

        data.equipment.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${item.name}</strong></td>
                <td>${item.category}</td>
                <td>${item.available}</td>
                <td>${item.total}</td>
                <td>₱${parseFloat(item.replacement_cost).toFixed(2)}</td>
                <td>
                    <button class="edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Attach events
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                alert('Edit equipment ID: ' + id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (confirm('Delete this equipment?')) {
                    deleteEquipment(id, token);
                }
            });
        });
    })
    .catch(error => {
        console.error('Error:', error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#c0392b;">Failed to load equipment.</td></tr>';
    });

    // ===== DELETE EQUIPMENT =====
    function deleteEquipment(id, token) {
        fetch(`https://brgy-sbr.online/admin-equipment.php?id=${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Equipment deleted successfully');
                location.reload();
            } else {
                alert('Failed to delete equipment');
            }
        })
        .catch(error => console.error('Error:', error));
    }
});