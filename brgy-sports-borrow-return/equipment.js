// equipment.js

document.addEventListener('DOMContentLoaded', function() {
    // ===== DISPLAY USER INFO =====
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        document.querySelector('.name').textContent = user.name;
        document.querySelector('.role').textContent = user.role === 'admin' ? 'Admin' : 'Resident';
    }

    // ===== FETCH EQUIPMENT =====
    fetch('https://brgy-sbr.online/equipment.php')
        .then(response => response.json())
        .then(data => {
            const grid = document.getElementById('equipmentGrid');
            grid.innerHTML = '';

            data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'equipment-card';
                card.setAttribute('data-name', item.name);
                card.setAttribute('data-category', item.category.toLowerCase());

                
            let imageName = item.name.toLowerCase().replace(/ /g, '');
            if (item.name === 'Sepak Takraw Ball') {
                imageName = 'sepak';  // Gamitin ang actual filename
}
                const imagePath = `images/${imageName}.jpg`;

                card.innerHTML = `
                    <img src="${imagePath}" alt="${item.name}" onerror="this.src='images/placeholder.jpg'" />
                    <h4>${item.name}</h4>
                    <p>Available: ${item.available}</p>
                    <a href="borrow.html" class="ctta-button">Borrow</a>
                `;

                grid.appendChild(card);
            });

            // Re-apply filter after loading
            filterEquipment();
        })
        .catch(error => console.error('Error:', error));

    // ===== SEARCH & FILTER =====
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');

    function filterEquipment() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const category = categoryFilter.value;
        const cards = document.querySelectorAll('.equipment-card');

        cards.forEach(card => {
            const name = card.getAttribute('data-name').toLowerCase();
            const cardCategory = card.getAttribute('data-category');

            const matchesSearch = name.includes(searchTerm);
            const matchesCategory = category === 'all' || cardCategory === category;

            card.style.display = (matchesSearch && matchesCategory) ? 'flex' : 'none';
        });
    }

    searchInput.addEventListener('input', filterEquipment);
    categoryFilter.addEventListener('change', filterEquipment);
});