<?php
// dashboard.php

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

if (!$userId) {
    echo json_encode(['success' => false, 'message' => 'Invalid token']);
    exit;
}

$data = [];

// Stats
$result = $conn->query("SELECT COUNT(*) as count FROM borrows WHERE user_id = $userId AND status = 'borrowed'");
$data['activeBorrows'] = $result->fetch_assoc()['count'] ?? 0;

$result = $conn->query("SELECT COUNT(*) as count FROM borrows WHERE user_id = $userId AND status IN ('borrowed', 'overdue')");
$data['pendingReturns'] = $result->fetch_assoc()['count'] ?? 0;

$result = $conn->query("SELECT COUNT(*) as count FROM borrows WHERE user_id = $userId AND status = 'overdue'");
$data['overdueItems'] = $result->fetch_assoc()['count'] ?? 0;

$result = $conn->query("SELECT SUM(amount) as total FROM penalties WHERE user_id = $userId AND paid_status = 0");
$data['totalPenalty'] = $result->fetch_assoc()['total'] ?? 0;

// Recent Activity
$recent = [];
$result = $conn->query("
    SELECT b.*, e.name as equipment_name 
    FROM borrows b
    JOIN equipment e ON b.equipment_id = e.id
    WHERE b.user_id = $userId
    ORDER BY b.created_at DESC
    LIMIT 5
");
while ($row = $result->fetch_assoc()) {
    $recent[] = $row;
}
$data['recentActivity'] = $recent;

echo json_encode(['success' => true, 'data' => $data]);
?>