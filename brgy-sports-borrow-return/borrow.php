<?php
// borrow.php - CORRECTED

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
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

// ===== GET REQUEST DATA =====
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!$data) {
    parse_str($raw, $data);
}

$action = $data['action'] ?? '';

// ============================================================
// REPORT LOST
// ============================================================
if ($action === 'report-lost') {
    $borrowId = $data['borrow_id'] ?? 0;
    
    if (!$borrowId) {
        echo json_encode(['success' => false, 'message' => 'Borrow ID required']);
        exit;
    }
    
    $stmt = $conn->prepare("SELECT id, lost_status FROM borrows WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $borrowId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Borrow record not found']);
        exit;
    }
    
    $borrow = $result->fetch_assoc();
    
    if ($borrow['lost_status'] !== 'none') {
        echo json_encode(['success' => false, 'message' => 'This item is already reported as lost']);
        exit;
    }
    
    $stmt = $conn->prepare("UPDATE borrows SET lost_status = 'reported', lost_type = 'lost', lost_reported_date = CURDATE() WHERE id = ?");
    $stmt->bind_param("i", $borrowId);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true, 
            'message' => 'Lost report submitted. You have 7 days to find and return the item.'
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to report lost']);
    }
    exit;
}

// ============================================================
// REPORT DAMAGE
// ============================================================
if ($action === 'report-damage') {
    $borrowId = $data['borrow_id'] ?? 0;
    
    if (!$borrowId) {
        echo json_encode(['success' => false, 'message' => 'Borrow ID required']);
        exit;
    }
    
    $stmt = $conn->prepare("SELECT id, lost_status FROM borrows WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $borrowId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Borrow record not found']);
        exit;
    }
    
    $borrow = $result->fetch_assoc();
    
    if ($borrow['lost_status'] !== 'none') {
        echo json_encode(['success' => false, 'message' => 'This item is already reported']);
        exit;
    }
    
    $stmt = $conn->prepare("UPDATE borrows SET lost_status = 'reported', lost_type = 'damage', lost_reported_date = CURDATE() WHERE id = ?");
    $stmt->bind_param("i", $borrowId);
    
    if ($stmt->execute()) {
        echo json_encode([
            'success' => true, 
            'message' => 'Damage reported. Waiting for admin confirmation.'
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to report damage']);
    }
    exit;
}

// ============================================================
// BORROW EQUIPMENT
// ============================================================
if ($action === 'borrow' || !$action) {
    $equipmentId = $data['equipment_id'] ?? 0;
    $quantity = $data['quantity'] ?? 1;
    $dueDate = $data['due_date'] ?? date('Y-m-d', strtotime('+7 days'));
    $purpose = $data['purpose'] ?? '';

    if (!$equipmentId) {
        echo json_encode(['success' => false, 'message' => 'Equipment is required']);
        exit;
    }

    // Check if equipment exists and has available stock
    $stmt = $conn->prepare("SELECT id, name, available FROM equipment WHERE id = ?");
    $stmt->bind_param("i", $equipmentId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Equipment not found']);
        exit;
    }

    $equipment = $result->fetch_assoc();

    if ($equipment['available'] < $quantity) {
        echo json_encode(['success' => false, 'message' => 'Not enough stock available']);
        exit;
    }

    // Check if user is banned
    $stmt = $conn->prepare("SELECT is_banned, warning_count FROM users WHERE id = ?");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if ($user['is_banned'] == 1) {
        echo json_encode(['success' => false, 'message' => 'Your account is banned. Please settle your penalties.']);
        exit;
    }

    // Check if user has reached 3 warnings
    if ($user['warning_count'] >= 3) {
        echo json_encode(['success' => false, 'message' => 'Your account has been banned due to 3 warnings.']);
        // Ban the user
        $stmt = $conn->prepare("UPDATE users SET is_banned = 1, ban_reason = '3 warnings' WHERE id = ?");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        exit;
    }

    // Insert borrow record
    $stmt = $conn->prepare("INSERT INTO borrows (user_id, equipment_id, quantity, due_date, purpose, status) VALUES (?, ?, ?, ?, ?, 'borrowed')");
    $stmt->bind_param("iiiss", $userId, $equipmentId, $quantity, $dueDate, $purpose);

    if ($stmt->execute()) {
        // Update available quantity
        $newAvailable = $equipment['available'] - $quantity;
        $stmt2 = $conn->prepare("UPDATE equipment SET available = ? WHERE id = ?");
        $stmt2->bind_param("ii", $newAvailable, $equipmentId);
        $stmt2->execute();

        echo json_encode([
            'success' => true,
            'message' => 'Equipment borrowed successfully!',
            'borrow_id' => $conn->insert_id
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to borrow equipment']);
    }
    exit;
}

// ============================================================
// INVALID REQUEST
// ============================================================
echo json_encode(['success' => false, 'message' => 'Invalid request']);
?>