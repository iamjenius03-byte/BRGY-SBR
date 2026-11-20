<?php
// admin-equipment.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
$userRole = $userData['role'] ?? '';

if (!$userId || $userRole !== 'admin') {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// GET all equipment
if ($method === 'GET') {
    $result = $conn->query("SELECT * FROM equipment ORDER BY id DESC");
    $equipment = [];
    while ($row = $result->fetch_assoc()) {
        $equipment[] = $row;
    }
    echo json_encode(['success' => true, 'equipment' => $equipment]);
    exit;
}

// POST - Add equipment
if ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $name = $data['name'] ?? '';
    $category = $data['category'] ?? '';
    $available = $data['available'] ?? 0;
    $total = $data['total'] ?? 0;
    $cost = $data['replacement_cost'] ?? 0;

    if (!$name || !$category) {
        echo json_encode(['success' => false, 'message' => 'Name and category required']);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO equipment (name, category, available, total, replacement_cost) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("ssiid", $name, $category, $available, $total, $cost);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Equipment added successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to add equipment']);
    }
    exit;
}

// PUT - Update equipment
if ($method === 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $data['id'] ?? 0;
    $name = $data['name'] ?? '';
    $category = $data['category'] ?? '';
    $available = $data['available'] ?? 0;
    $total = $data['total'] ?? 0;
    $cost = $data['replacement_cost'] ?? 0;

    if (!$id || !$name || !$category) {
        echo json_encode(['success' => false, 'message' => 'ID, name, category required']);
        exit;
    }

    $stmt = $conn->prepare("UPDATE equipment SET name = ?, category = ?, available = ?, total = ?, replacement_cost = ? WHERE id = ?");
    $stmt->bind_param("ssiidi", $name, $category, $available, $total, $cost, $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Equipment updated successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to update equipment']);
    }
    exit;
}

// DELETE - Delete equipment
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? 0;
    
    if (!$id) {
        echo json_encode(['success' => false, 'message' => 'ID required']);
        exit;
    }

    $stmt = $conn->prepare("DELETE FROM equipment WHERE id = ?");
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Equipment deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to delete equipment']);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid request']);
?>