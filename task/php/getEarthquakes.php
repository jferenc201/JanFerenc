<?php

$north = $_REQUEST['north'];
$south = $_REQUEST['south'];
$east  = $_REQUEST['east'];
$west  = $_REQUEST['west'];

$url = "http://api.geonames.org/earthquakesJSON?north=" . $north . "&south=" . $south . "&east=" . $east . "&west=" . $west . "&username=janferenc";

$result = file_get_contents($url);
$decode = json_decode($result, true);

$output = [];
$output['data'] = isset($decode['earthquakes']) ? $decode['earthquakes'] : [];

header('Content-Type: application/json; charset=UTF-8');
echo json_encode($output);

?>