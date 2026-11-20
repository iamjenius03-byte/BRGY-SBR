<?php
// database.php

$host = 'localhost';
$username = 'u907280979_jen';
$password = 'cagayaN123';
$database = 'u907280979_brgy_sbr';

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");
$GLOBALS['conn'] = $conn;
?>