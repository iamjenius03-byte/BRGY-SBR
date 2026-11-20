<?php
// add_equipment.php

require_once 'database.php';

$equipment = [
    ['Basketball', 'Ball', 8, 10, 500.00],
    ['Volleyball', 'Ball', 5, 5, 450.00],
    ['Badminton Racket', 'Racket', 3, 4, 300.00],
    ['Table Tennis Paddle', 'Racket', 4, 6, 250.00],
    ['Sepak Takraw Ball', 'Ball', 6, 8, 350.00]
];

foreach ($equipment as $item) {
    $stmt = $conn->prepare("INSERT INTO equipment (name, category, available, total, replacement_cost) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("ssidd", $item[0], $item[1], $item[2], $item[3], $item[4]);
    $stmt->execute();
}

echo "✅ Equipment added successfully!";
?>