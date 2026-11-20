const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const equipmentCards = document.querySelectorAll('.equipment-card');

function filterEquipment() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const category = categoryFilter.value;

    equipmentCards.forEach(card => {
        const name = card.getAttribute('data-name').toLowerCase();
        const cardCategory = card.getAttribute('data-category');

        const matchesSearch = name.includes(searchTerm);
        const matchesCategory = category === 'all' || cardCategory === category;

        if (matchesSearch && matchesCategory) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

searchInput.addEventListener('input', filterEquipment);
categoryFilter.addEventListener('change', filterEquipment);
