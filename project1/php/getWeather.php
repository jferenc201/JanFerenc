<?php

$lat = $_GET['lat'];
$lng = $_GET['lng'];

$url = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lng&current_weather=true&hourly=relativehumidity_2m";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($ch);
curl_close($ch);

$data = json_decode($result, true);

if (!$data || !isset($data['current_weather'])) {
    echo json_encode(["weatherObservation" => null]);
    exit;
}

// get humidity from hourly (closest time)
$humidity = $data['hourly']['relativehumidity_2m'][0] ?? "N/A";

echo json_encode([
    "weatherObservation" => [
        "temperature" => $data['current_weather']['temperature'],
        "humidity" => $humidity,
        "stationName" => "Open-Meteo"
    ]
]);