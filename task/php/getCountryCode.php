<?php

$lat = $_REQUEST['lat'];
$lng = $_REQUEST['lng'];

$url = "http://api.geonames.org/countryCodeJSON?lat=" . $lat . "&lng=" . $lng . "&username=janferenc";

$result = file_get_contents($url);
$decode = json_decode($result, true);

$output = [];
$output['data'] = $decode;

header('Content-Type: application/json; charset=UTF-8');
echo json_encode($output);

?>