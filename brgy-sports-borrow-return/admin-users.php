<?php
// admin-users.php - CORRECTED (walang created_at)

ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'database.php';

// ===== AGGRESSIVE TOKEN HANDLING =====
$token = '';
$headers = getallheaders();
$token = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (!$token) {
    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
}

if (!$token && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    $token = $headers['Authorization'] ?? $headers['authorization'] ?? '';
}

$token = str_replace('Bearer ', '', $token);

if (!$token) {
    echo json_encode(['success' => false, 'message' => 'No token provided']);
    exit;
}

// Decode token
$userData = json_decode(base64_decode($token), true);
$userId = $userData['id'] ?? 0;
$userRole = $userData['role'] ?? '';

if (!$userId || $userRole !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// ===== GET ALL USERS =====
if ($method === 'GET') {
    $result = $conn->query("
        SELECT id, name, email, role, is_banned, warning_count
        FROM users
        WHERE role != 'admin'
        ORDER BY id DESC
    ");
    
    if (!$result) {
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $conn->error]);
        exit;
    }
    
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    
    echo json_encode(['success' => true, 'users' => $users]);
    exit;
}

// ===== BAN/UNBAN USER =====
if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    $isBanned = $data['is_banned'] ?? 0;

    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'User ID required']);
        exit;
    }

    $stmt = $conn->prepare("UPDATE users SET is_banned = ? WHERE id = ?");
    $stmt->bind_param("ii", $isBanned, $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'User updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update user']);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid request']);
?>