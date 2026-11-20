<?php
// my-borrowings.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once 'database.php';

// ===== GET TOKEN =====
$token = '';

// Try $_SERVER first
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $token = $_SERVER['HTTP_AUTHORIZATION'];
} else {
    // Try getallheaders()
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    $token = $authHeader;
}

$token = str_replace('Bearer ', '', $token);

if (!$token) {
    echo json_encode(['success' => false, 'message' => 'No token provided']);
    exit;
}

// Decode token
$userData = json_decode(base64_decode($token), true);

if (!$userData || !isset($userData['id'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid token']);
    exit;
}

$userId = $userData['id'];

// ===== GET BORROWINGS =====
$stmt = $conn->prepare("
    SELECT b.*, e.name as equipment_name 
    FROM borrows b
    JOIN equipment e ON b.equipment_id = e.id
    WHERE b.user_id = ? AND b.status IN ('borrowed', 'overdue')
    ORDER BY b.due_date ASC
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

$borrows = [];
while ($row = $result->fetch_assoc()) {
    $borrows[] = $row;
}

echo json_encode(['success' => true, 'borrows' => $borrows]);
?>