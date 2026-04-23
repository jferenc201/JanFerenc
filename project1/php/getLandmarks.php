<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
$lat = $_GET['lat'] ?? '';
$lng = $_GET['lng'] ?? '';
$country = $_GET['country'] ?? '';
$username = 'janferenc';
$url = "https://secure.geonames.org/searchJSON?lat={$lat}&lng={$lng}&radius=200&maxRows=25&featureCode=MNMT&featureCode=MUS&featureCode=CSTL&featureCode=HSTS&featureCode=CHRCH&country={$country}&username={$username}";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');
$response = curl_exec($ch);
curl_close($ch);
echo $response ?: json_encode(['error' => 'Failed']);
?>