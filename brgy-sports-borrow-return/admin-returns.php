<?php
// admin-returns.php - SIMPLIFIED WORKING VERSION

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

$userData = json_decode(base64_decode($token), true);
$userId = $userData['id'] ?? 0;
$userRole = $userData['role'] ?? '';

if (!$userId || $userRole !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// ===== GET ALL RETURNS (SIMPLIFIED - NO BORROWS JOIN) =====
if ($method === 'GET') {
    $result = $conn->query("
        SELECT r.*, u.name as user_name, e.name as equipment_name
        FROM returns r
        JOIN users u ON r.user_id = u.id
        JOIN equipment e ON r.equipment_id = e.id
        ORDER BY r.id DESC
    ");

    if (!$result) {
        echo json_encode(['success' => false, 'message' => 'Query failed: ' . $conn->error]);
        exit;
    }

    $returns = [];
    while ($row = $result->fetch_assoc()) {
        $returns[] = $row;
    }
    echo json_encode(['success' => true, 'returns' => $returns]);
    exit;
}

// ===== ADMIN: CONFIRM, NOT RETURNED, PAY PENALTY =====
if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    $action = $data['action'] ?? '';

    if (!$id || !$action) {
        echo json_encode(['success' => false, 'message' => 'ID and action required']);
        exit;
    }

    // Get return record details
    $stmt = $conn->prepare("SELECT borrow_id, user_id, equipment_id FROM returns WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $returnRecord = $result->fetch_assoc();
    if (!$returnRecord) {
        echo json_encode(['success' => false, 'message' => 'Return record not found']);
        exit;
    }

// ===== CONFIRM RETURN =====
if ($action === 'confirm') {
    $conn->begin_transaction();
    try {
        // Get the borrow record to get the quantity
        $stmt = $conn->prepare("SELECT quantity FROM borrows WHERE id = ?");
        $stmt->bind_param("i", $returnRecord['borrow_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $borrowData = $result->fetch_assoc();
        $quantity = $borrowData['quantity'] ?? 1;
        
        // Update borrow status
        $stmt = $conn->prepare("UPDATE borrows SET status = 'returned' WHERE id = ?");
        $stmt->bind_param("i", $returnRecord['borrow_id']);
        $stmt->execute();

        // Increase equipment available quantity by the actual borrowed quantity
        $stmt = $conn->prepare("UPDATE equipment SET available = available + ? WHERE id = ?");
        $stmt->bind_param("ii", $quantity, $returnRecord['equipment_id']);
        $stmt->execute();

        // Update return status
        $stmt = $conn->prepare("UPDATE returns SET status = 'completed' WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();

        $conn->commit();
        echo json_encode(['success' => true, 'message' => 'Return confirmed and completed']);
    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(['success' => false, 'message' => 'Failed: ' . $e->getMessage()]);
    }
    exit;
}

    // ===== NOT RETURNED =====
    if ($action === 'not_returned') {
        $stmt = $conn->prepare("UPDATE returns SET status = 'not_returned' WHERE id = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Marked as not returned.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update']);
        }
        exit;
    }

    // ===== PAY PENALTY =====
    if ($action === 'pay_penalty') {
        $stmt = $conn->prepare("UPDATE returns SET status = 'penalty_paid' WHERE id = ?");
        $stmt->bind_param("i", $id);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Penalty marked as paid.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to update']);
        }
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid request']);
?>