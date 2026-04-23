<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
$lat = $_GET['lat'] ?? '';
$lng = $_GET['lng'] ?? '';
$url = "https://api.open-meteo.com/v1/forecast?latitude={$lat}&longitude={$lng}&current_weather=true&daily=temperature_2m_max,weathercode&timezone=auto";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
$response = curl_exec($ch);
curl_close($ch);
echo $response ?: json_encode(['error' => 'Failed']);
?>