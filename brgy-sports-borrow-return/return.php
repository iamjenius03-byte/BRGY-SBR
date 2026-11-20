<?php
// return.php - CORRECTED (only one POST handler with pending)

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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

// ===== GET ACTIVE BORROWINGS (with pending return status) =====
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $conn->prepare("
        SELECT b.*, e.name as equipment_name, b.lost_status,
               (SELECT status FROM returns WHERE borrow_id = b.id AND status = 'pending') as return_status
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
    exit;
}

// ===== SUBMIT RETURN REQUEST (with pending status) =====
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    $borrowIds = $data['borrow_ids'] ?? [];

    if (empty($borrowIds)) {
        echo json_encode(['success' => false, 'message' => 'No items selected']);
        exit;
    }

    $successCount = 0;
    foreach ($borrowIds as $borrowId) {
        // Check if borrow exists and belongs to user
        $stmt = $conn->prepare("SELECT b.id, b.equipment_id, b.quantity, b.due_date, b.user_id FROM borrows b WHERE b.id = ? AND b.user_id = ? AND b.status IN ('borrowed', 'overdue')");
        $stmt->bind_param("ii", $borrowId, $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        if ($result->num_rows === 0) continue;

        $borrow = $result->fetch_assoc();

        // Check if there's already a pending return for this borrow
        $check = $conn->prepare("SELECT id FROM returns WHERE borrow_id = ? AND status = 'pending'");
        $check->bind_param("i", $borrowId);
        $check->execute();
        $checkResult = $check->get_result();
        if ($checkResult->num_rows > 0) continue;

        // Calculate late fee
        $lateFee = 0;
        $due = new DateTime($borrow['due_date']);
        $now = new DateTime();
        if ($now > $due) {
            $diff = $now->diff($due);
            $lateFee = $diff->days * 5;
        }

        // If there's a late fee, add warning to user
        if ($lateFee > 0) {
            // Get current warning count
            $stmt = $conn->prepare("SELECT warning_count FROM users WHERE id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            $newWarningCount = ($user['warning_count'] ?? 0) + 1;

            // Update warning count
            $stmt = $conn->prepare("UPDATE users SET warning_count = ? WHERE id = ?");
            $stmt->bind_param("ii", $newWarningCount, $userId);
            $stmt->execute();

            // If 3 warnings, ban the user
            if ($newWarningCount >= 3) {
                $stmt = $conn->prepare("UPDATE users SET is_banned = 1, ban_reason = '3 warnings (unpaid penalties)' WHERE id = ?");
                $stmt->bind_param("i", $userId);
                $stmt->execute();
            }
        }

        // Insert return request with status 'pending'
        $stmt = $conn->prepare("
            INSERT INTO returns (borrow_id, user_id, equipment_id, return_date, late_fee, status) 
            VALUES (?, ?, ?, NOW(), ?, 'pending')
        ");
        $stmt->bind_param("iiid", $borrowId, $userId, $borrow['equipment_id'], $lateFee);
        if ($stmt->execute()) {
            $successCount++;
        }
    }

    echo json_encode([
        'success' => true,
        'message' => $successCount > 0 ? "Return request submitted. Waiting for admin confirmation." : "No new return requests."
    ]);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid request']);
?>