<?php
// auth.php - SIMPLE VERSION

ini_set('display_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'database.php';

// ===== GET THE ACTION FROM REQUEST =====
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : '');

// ===== REGISTER =====
if ($action === 'register') {
    // Get raw POST data
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    
    // If not JSON, try form data
    if (!$data) {
        parse_str($raw, $data);
    }
    
    // Fallback to POST
    if (!$data) {
        $data = $_POST;
    }
    
    $name = $data['name'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    if (!$name || !$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        exit;
    }
    
    // Check if email exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Email already registered']);
        exit;
    }
    
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    
    $stmt = $conn->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $name, $email, $hashedPassword);
    
    if ($stmt->execute()) {
        $userId = $conn->insert_id;
        echo json_encode([
            'success' => true,
            'message' => 'Registration successful',
            'user' => [
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'role' => 'resident'
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Registration failed']);
    }
    exit;
}

// ===== LOGIN =====
if ($action === 'login') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    
    if (!$data) {
        parse_str($raw, $data);
    }
    
    if (!$data) {
        $data = $_POST;
    }
    
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    if (!$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        exit;
    }
    
    $stmt = $conn->prepare("SELECT id, name, email, password, role, is_banned FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit;
    }
    
    $user = $result->fetch_assoc();
    
    if ($user['is_banned'] == 1) {
        echo json_encode(['success' => false, 'message' => 'Your account has been banned']);
        exit;
    }
    
    if (!password_verify($password, $user['password'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        exit;
    }
    
    $token = base64_encode(json_encode([
        'id' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role']
    ]));
    
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role']
        ]
    ]);
    exit;
}

// ===== INVALID =====
echo json_encode(['success' => false, 'message' => 'Invalid action', 'action' => $action]);
?>