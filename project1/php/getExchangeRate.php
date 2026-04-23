<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
$base = $_GET['base'] ?? 'USD';
$key = 'd6e2d15eb6a36d807a21f119';
$url = "https://v6.exchangerate-api.com/v6/{$key}/latest/{$base}";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
$response = curl_exec($ch);
curl_close($ch);
echo $response ?: json_encode(['error' => 'Failed']);
?>