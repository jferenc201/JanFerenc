<?php
header('Content-Type: application/json');

$paths = [
    __DIR__ . '/../libs/js/countryBorders.geo.json',
    __DIR__ . '/../libs/countryBorders.geo.json',
    __DIR__ . '/countryBorders.geo.json',
];

$json = null;
foreach ($paths as $path) {
    if (file_exists($path)) {
        $json = file_get_contents($path);
        break;
    }
}

if (!$json) {
    echo json_encode(['error' => 'File not found', 'tried' => $paths]);
    exit;
}

$data = json_decode($json, true);

$countries = [];
foreach ($data['features'] as $feature) {
    $id = $feature['id'] ?? '';
    $name = $feature['properties']['name'] ?? '';
    if ($id && $name) {
        $countries[] = ['id' => $id, 'name' => $name];
    }
}

usort($countries, fn($a, $b) => strcmp($a['name'], $b['name']));

echo json_encode($countries);
?>