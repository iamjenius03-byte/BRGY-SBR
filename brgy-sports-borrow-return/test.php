<?php
// test.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "1. PHP is running<br>";

$host = 'localhost';
$username = 'u907280979_jen';
$password = 'cagayaN123';
$database = 'u907280979_brgy_sbr';

echo "2. Credentials set<br>";

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    echo "❌ Connection failed: " . $conn->connect_error;
} else {
    echo "✅ Connected successfully to database: " . $database;
}

$conn->close();
?>