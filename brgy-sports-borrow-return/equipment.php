<?php
// equipment.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'database.php';

$result = $conn->query("SELECT id, name, category, available, total, replacement_cost FROM equipment ORDER BY id DESC");

$equipment = [];
while ($row = $result->fetch_assoc()) {
    $equipment[] = $row;
}

echo json_encode($equipment);
?>