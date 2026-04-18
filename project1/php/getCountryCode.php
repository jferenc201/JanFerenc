<?php

$lat = $_GET['lat'];
$lng = $_GET['lng'];

$url = "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=$lat&longitude=$lng&localityLanguage=en";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($ch);
curl_close($ch);

$data = json_decode($result, true);

if (!$data || !isset($data['countryName'])) {
    echo json_encode([
        "countryName" => "Unknown location",
        "countryCode" => "N/A"
    ]);
    exit;
}

echo json_encode([
    "countryName" => $data['countryName'],
    "countryCode" => $data['countryCode']
]);