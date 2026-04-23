<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
$code = $_GET['code'] ?? '';
$context = stream_context_create(['http' => ['method' => 'GET', 'header' => 'User-Agent: Mozilla/5.0']]);
$response = file_get_contents("https://restcountries.com/v3.1/alpha/{$code}", false, $context);
echo $response ?: json_encode(['error' => 'Failed']);
?>