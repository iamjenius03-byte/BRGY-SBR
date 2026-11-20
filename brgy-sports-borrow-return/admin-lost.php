<?php
// admin-lost.php

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

// ===== GET LOST REPORTS with days since report =====
$result = $conn->query("
    SELECT b.*, u.name as user_name, e.name as equipment_name,
           DATEDIFF(CURDATE(), b.lost_reported_date) as days_since_report,
           p.id as penalty_id, p.amount as penalty_amount, p.paid_status as penalty_paid
    FROM borrows b
    JOIN users u ON b.user_id = u.id
    JOIN equipment e ON b.equipment_id = e.id
    LEFT JOIN penalties p ON b.id = p.borrow_id
    WHERE b.lost_status != 'none'
    ORDER BY b.lost_reported_date DESC
");

$lost = [];
while ($row = $result->fetch_assoc()) {
    $lost[] = $row;
}

echo json_encode(['success' => true, 'lost' => $lost]);

// ============================================================
// PUT - Confirm Damage, Mark as Paid, Resolve
// ============================================================
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    $action = $data['action'] ?? '';

    if (!$id || !$action) {
        echo json_encode(['success' => false, 'message' => 'ID and action required']);
        exit;
    }

    // ===== CONFIRM LOST =====
    if ($action === 'confirm') {
        $stmt = $conn->prepare("SELECT user_id, equipment_id FROM borrows WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $borrow = $result->fetch_assoc();

        if (!$borrow) {
            echo json_encode(['success' => false, 'message' => 'Borrow record not found']);
            exit;
        }

        $stmt = $conn->prepare("SELECT replacement_cost FROM equipment WHERE id = ?");
        $stmt->bind_param("i", $borrow['equipment_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $equipment = $result->fetch_assoc();
        $cost = $equipment['replacement_cost'] ?? 0;

        $stmt = $conn->prepare("UPDATE borrows SET lost_status = 'confirmed', lost_confirmed_date = CURDATE(), replacement_cost_applied = ? WHERE id = ?");
        $stmt->bind_param("di", $cost, $id);
        $stmt->execute();

        if ($cost > 0) {
            $stmt = $conn->prepare("INSERT INTO penalties (user_id, borrow_id, amount, type, paid_status) VALUES (?, ?, ?, 'replacement', 0)");
            $stmt->bind_param("iid", $borrow['user_id'], $id, $cost);
            $stmt->execute();
        }

        $stmt = $conn->prepare("UPDATE users SET is_banned = 1, ban_reason = 'Unpaid replacement cost' WHERE id = ?");
        $stmt->bind_param("i", $borrow['user_id']);
        $stmt->execute();

        echo json_encode(['success' => true, 'message' => 'Lost confirmed, replacement cost applied, user banned']);
        exit;
    }

    // ===== CONFIRM DAMAGE =====
    if ($action === 'confirm-damage') {
        $stmt = $conn->prepare("SELECT user_id, equipment_id FROM borrows WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $borrow = $result->fetch_assoc();

        if (!$borrow) {
            echo json_encode(['success' => false, 'message' => 'Borrow record not found']);
            exit;
        }

        $stmt = $conn->prepare("SELECT replacement_cost FROM equipment WHERE id = ?");
        $stmt->bind_param("i", $borrow['equipment_id']);
        $stmt->execute();
        $result = $stmt->get_result();
        $equipment = $result->fetch_assoc();
        $cost = $equipment['replacement_cost'] ?? 300;

        $stmt = $conn->prepare("UPDATE borrows SET lost_status = 'confirmed', lost_confirmed_date = CURDATE(), replacement_cost_applied = ? WHERE id = ?");
        $stmt->bind_param("di", $cost, $id);
        $stmt->execute();

        $stmt = $conn->prepare("INSERT INTO penalties (user_id, borrow_id, amount, type, paid_status) VALUES (?, ?, ?, 'replacement', 0)");
        $stmt->bind_param("iid", $borrow['user_id'], $id, $cost);
        $stmt->execute();

        echo json_encode(['success' => true, 'message' => 'Damage confirmed, replacement cost applied']);
        exit;
    }

    // ===== MARK AS PAID =====
    if ($action === 'paid') {
        $stmt = $conn->prepare("UPDATE penalties SET paid_status = 1, paid_date = CURDATE() WHERE borrow_id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();

        $stmt = $conn->prepare("UPDATE borrows SET lost_status = 'resolved' WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();

        echo json_encode(['success' => true, 'message' => 'Payment confirmed, damage resolved']);
        exit;
    }

    // ===== RESOLVE =====
    if ($action === 'resolve') {
        $stmt = $conn->prepare("UPDATE borrows SET lost_status = 'resolved' WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();

        echo json_encode(['success' => true, 'message' => 'Lost report resolved']);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    exit;
}

?>