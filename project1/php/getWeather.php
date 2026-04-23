<?php

header('Content-Type: application/json');

$lat = $_GET['lat'];
$lng = $_GET['lng'];

$username = "janferenc"; 


$url = "http://api.geonames.org/findNearByWeatherJSON?lat=$lat&lng=$lng&username=$username";


$response = file_get_contents($url);

echo $response;

?>