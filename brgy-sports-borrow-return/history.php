<?php
// history.php - CHRONOLOGICAL ORDER (OLDEST TO NEWEST)

ini_set('display_errors', 1);
error_reporting(E_ALL);

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

$history = [];

// ===== 1. BORROW =====
$stmt = $conn->prepare("
    SELECT 'borrow' as type, e.name as equipment_name,
           b.borrow_date as date, b.status, b.purpose,
           NULL as amount, NULL as paid_status,
           b.borrow_date, b.due_date, NULL as return_date,
           b.borrow_date as sort_date,
           b.id as event_id
    FROM borrows b
    JOIN equipment e ON b.equipment_id = e.id
    WHERE b.user_id = ?
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $row['description'] = 'Borrowed ' . $row['equipment_name'];
    $history[] = $row;
}

// ===== 2. RETURN =====
$stmt = $conn->prepare("
    SELECT 'return' as type, e.name as equipment_name,
           r.return_date as date, r.status,
           r.late_fee as amount,
           b.borrow_date, b.due_date, r.return_date,
           r.return_date as sort_date,
           r.id as event_id,
           b.purpose
    FROM returns r
    JOIN equipment e ON r.equipment_id = e.id
    JOIN borrows b ON r.borrow_id = b.id
    WHERE r.user_id = ?
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $row['description'] = 'Returned ' . $row['equipment_name'];
    if ($row['amount'] > 0) {
        $row['description'] .= ' (Late fee: ₱' . number_format($row['amount'], 2) . ')';
    }
    $history[] = $row;
}

// ===== 3. LOST/DAMAGE =====
$stmt = $conn->prepare("
    SELECT 'report' as type, e.name as equipment_name,
           b.lost_reported_date as date, b.status, b.purpose,
           b.replacement_cost_applied as amount,
           b.lost_type, b.lost_status,
           b.borrow_date, b.due_date,
           b.lost_reported_date as sort_date,
           b.id as event_id
    FROM borrows b
    JOIN equipment e ON b.equipment_id = e.id
    WHERE b.user_id = ? AND b.lost_status != 'none'
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $type = $row['lost_type'] === 'damage' ? 'Damage' : 'Lost';
    $row['description'] = 'Reported ' . $type . ' for ' . $row['equipment_name'];
    
    if ($row['lost_status'] === 'reported') {
        $row['status'] = 'Reported';
    } elseif ($row['lost_status'] === 'confirmed' && $row['amount'] > 0) {
        $row['status'] = 'To be paid';
    } elseif ($row['lost_status'] === 'confirmed' && $row['paid_status'] == 1) {
        $row['status'] = 'Paid';
    } elseif ($row['lost_status'] === 'resolved') {
        $row['status'] = 'Resolved';
    }
    
    if ($row['amount'] > 0) {
        $row['description'] .= ' (Replacement fee: ₱' . number_format($row['amount'], 2) . ')';
    }
    $history[] = $row;
}

// ===== 4. PENALTY =====
$stmt = $conn->prepare("
    SELECT 'penalty' as type, e.name as equipment_name,
           p.created_at as date,
           p.amount, p.paid_status,
           b.borrow_date, b.due_date,
           p.type as penalty_type,
           p.created_at as sort_date,
           p.id as event_id,
           b.purpose
    FROM penalties p
    LEFT JOIN borrows b ON p.borrow_id = b.id
    LEFT JOIN equipment e ON b.equipment_id = e.id
    WHERE p.user_id = ?
");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $type = $row['penalty_type'] === 'replacement' ? 'Replacement fee' : 'Late fee';
    $row['description'] = $type . ' of ₱' . number_format($row['amount'], 2);
    if ($row['paid_status'] == 1) {
        $row['description'] .= ' (Paid)';
    } else {
        $row['description'] .= ' (Unpaid)';
    }
    if ($row['equipment_name']) {
        $row['description'] .= ' for ' . $row['equipment_name'];
    }
    $history[] = $row;
}

// ===== SORT: CHRONOLOGICAL (OLDEST TO NEWEST) =====
usort($history, function($a, $b) {
    $dateA = strtotime($a['sort_date'] ?? '1970-01-01');
    $dateB = strtotime($b['sort_date'] ?? '1970-01-01');
    
    if ($dateA !== $dateB) {
        return $dateA - $dateB; // ascending (oldest first)
    }
    
    // If same date, sort by ID ascending (oldest record first)
    return ($a['event_id'] ?? 0) - ($b['event_id'] ?? 0);
});

echo json_encode(['success' => true, 'history' => $history]);
?>