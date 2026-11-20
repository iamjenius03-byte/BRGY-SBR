<?php
// admin-overdue.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'database.php';

// ===== GET TOKEN =====
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
$token = str_replace('Bearer ', '', $authHeader);

if (!$token) {
    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = str_replace('Bearer ', '', $token);
}

if (!$token) {
    echo json_encode(['success' => false, 'message' => 'No token provided']);
    exit;
}

$userData = json_decode(base64_decode($token), true);
$userId = $userData['id'] ?? 0;
$userRole = $userData['role'] ?? '';

if (!$userId || $userRole !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$result = $conn->query("
    SELECT b.*, u.name as user_name, e.name as equipment_name,
           DATEDIFF(NOW(), b.due_date) as days_overdue
    FROM borrows b
    JOIN users u ON b.user_id = u.id
    JOIN equipment e ON b.equipment_id = e.id
    WHERE b.status = 'overdue'
    ORDER BY b.due_date ASC
");

$overdue = [];
while ($row = $result->fetch_assoc()) {
    $row['penalty'] = $row['days_overdue'] * 5;
    $overdue[] = $row;
}

echo json_encode(['success' => true, 'overdue' => $overdue]);
?>