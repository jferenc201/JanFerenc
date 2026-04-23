<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$code = strtolower($_GET['code'] ?? '');
if (!$code) { echo json_encode(['status' => 'error']); exit; }

$key = '938c9ea63f73497e9e308e10a37e3762';

$context = stream_context_create([
    'http' => ['method' => 'GET', 'header' => 'User-Agent: Mozilla/5.0']
]);

$url = "https://newsapi.org/v2/top-headlines?country={$code}&apiKey={$key}";
$response = file_get_contents($url, false, $context);
$data = json_decode($response, true);

if (!$response || empty($data['articles'])) {
    $url2 = "https://newsapi.org/v2/everything?q={$code}&language=en&sortBy=publishedAt&apiKey={$key}";
    $response = file_get_contents($url2, false, $context);
    $data = json_decode($response, true);
}

echo json_encode($data);
?>