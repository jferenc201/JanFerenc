<?php

$lat = $_REQUEST['lat'];
$lng = $_REQUEST['lng'];

$url = "http://api.geonames.org/findNearByWeatherJSON?lat=" . $lat . "&lng=" . $lng . "&username=janferenc";

$result = file_get_contents($url);
$decode = json_decode($result, true);

$output = [];
$output['data'] = isset($decode['weatherObservation']) ? $decode['weatherObservation'] : null;

header('Content-Type: application/json; charset=UTF-8');
echo json_encode($output);

?>