<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$south = $_GET['south'] ?? '51.3';
$west  = $_GET['west']  ?? '-0.5';
$north = $_GET['north'] ?? '51.7';
$east  = $_GET['east']  ?? '0.2';

$query = '[out:json][timeout:25];(node["tourism"="attraction"]('.$south.','.$west.','.$north.','.$east.');node["tourism"="museum"]('.$south.','.$west.','.$north.','.$east.');node["historic"="castle"]('.$south.','.$west.','.$north.','.$east.');node["historic"="monument"]('.$south.','.$west.','.$north.','.$east.'););out 30;';

$context = stream_context_create([
    'http' => [
        'method'  => 'POST',
        'header'  => 'Content-Type: application/x-www-form-urlencoded',
        'content' => $query,
        'timeout' => 30
    ]
]);

$response = file_get_contents('https://overpass-api.de/api/interpreter', false, $context);

if ($response === false) {
    echo json_encode(['error' => 'Failed to fetch from Overpass']);
} else {
    echo $response;
}
?>