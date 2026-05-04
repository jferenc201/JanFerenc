<?php

define('FINNHUB_KEY', 'd7s6969r01qm28g8f9ogd7s6969r01qm28g8f9p0');
define('CACHE_TTL',   2);  

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function fetch_url(string $url): array {
    $ctx = stream_context_create([
        'http' => [
            'method'  => 'GET',
            'timeout' => 5,
            'header'  => "User-Agent: AXIS-Terminal/1.0\r\n",
        ],
        'ssl'  => ['verify_peer' => true],
    ]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) {
        return ['error' => 'Upstream fetch failed', 'url' => $url];
    }
    $decoded = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return ['error' => 'Invalid JSON from upstream', 'raw' => substr($body, 0, 200)];
    }
    return $decoded;
}

function cache_get(string $key): ?string {
    $f = sys_get_temp_dir() . '/axis_' . md5($key) . '.json';
    if (file_exists($f) && (time() - filemtime($f)) < CACHE_TTL) {
        return file_get_contents($f);
    }
    return null;
}

function cache_set(string $key, string $data): void {
    $f = sys_get_temp_dir() . '/axis_' . md5($key) . '.json';
    file_put_contents($f, $data, LOCK_EX);
}

function respond(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function cached_fetch(string $url): array {
    $cached = cache_get($url);
    if ($cached !== null) {
        return json_decode($cached, true);
    }
    $data = fetch_url($url);
    cache_set($url, json_encode($data));
    return $data;
}

$endpoint = strtolower(trim($_GET['endpoint'] ?? ''));

switch ($endpoint) {

    case 'crypto':
        $symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
        $result  = [];
        foreach ($symbols as $sym) {
            $url  = 'https://api.binance.com/api/v3/ticker/24hr?symbol=' . $sym;
            $data = cached_fetch($url);
            if (isset($data['error'])) {
                respond(['error' => $data['error'], 'symbol' => $sym], 502);
            }
            $result[$sym] = [
                'symbol'        => $sym,
                'price'         => (float) $data['lastPrice'],
                'change_pct'    => (float) $data['priceChangePercent'],
                'change_abs'    => (float) $data['priceChange'],
                'high_24h'      => (float) $data['highPrice'],
                'low_24h'       => (float) $data['lowPrice'],
                'volume'        => (float) $data['volume'],
                'quote_volume'  => (float) $data['quoteVolume'],
            ];
        }
        respond($result);
        break;

    case 'crypto_single':
        $sym = strtoupper(trim($_GET['symbol'] ?? 'BTCUSDT'));
        $url = 'https://api.binance.com/api/v3/ticker/24hr?symbol=' . urlencode($sym);
        $data = cached_fetch($url);
        respond([
            'symbol'      => $sym,
            'price'       => (float) ($data['lastPrice'] ?? 0),
            'change_pct'  => (float) ($data['priceChangePercent'] ?? 0),
            'high_24h'    => (float) ($data['highPrice'] ?? 0),
            'low_24h'     => (float) ($data['lowPrice'] ?? 0),
        ]);
        break;


    case 'stock':
        $sym = strtoupper(trim($_GET['symbol'] ?? 'AAPL'));
        $allowed = ['AAPL','MSFT','NVDA','TSLA','AMZN','META','GOOGL','JPM'];
        if (!in_array($sym, $allowed, true)) {
            respond(['error' => 'Symbol not in allowed list', 'allowed' => $allowed], 400);
        }
        $url  = 'https://finnhub.io/api/v1/quote?symbol=' . $sym . '&token=' . FINNHUB_KEY;
        $data = cached_fetch($url);
        if (!isset($data['c']) || $data['c'] === 0) {
            respond(['error' => 'No quote data — market may be closed', 'symbol' => $sym], 503);
        }
        respond([
            'symbol'      => $sym,
            'price'       => $data['c'],
            'open'        => $data['o'],
            'high'        => $data['h'],
            'low'         => $data['l'],
            'prev_close'  => $data['pc'],
            'change_pct'  => $data['dp'],
            'change_abs'  => $data['d'],
            'timestamp'   => $data['t'],
        ]);
        break;

    case 'stocks':
        $symbols = ['AAPL','MSFT','NVDA','TSLA','AMZN','META','GOOGL','JPM'];
        $result  = [];
        foreach ($symbols as $sym) {
            $url  = 'https://finnhub.io/api/v1/quote?symbol=' . $sym . '&token=' . FINNHUB_KEY;
            $data = cached_fetch($url);
            $result[$sym] = [
                'symbol'     => $sym,
                'price'      => $data['c']  ?? null,
                'high'       => $data['h']  ?? null,
                'low'        => $data['l']  ?? null,
                'change_pct' => $data['dp'] ?? null,
                'change_abs' => $data['d']  ?? null,
            ];
        }
        respond($result);
        break;


    case 'sports':
        $league_map = [
            'nba'    => 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
            'nfl'    => 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
            'mlb'    => 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
            'nhl'    => 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
            'epl'    => 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
        ];
        $league = strtolower(trim($_GET['league'] ?? 'nba'));
        if (!array_key_exists($league, $league_map)) {
            respond(['error' => 'Unknown league', 'supported' => array_keys($league_map)], 400);
        }
        $raw    = cached_fetch($league_map[$league]);
        $events = $raw['events'] ?? [];
        $games  = [];
        foreach ($events as $ev) {
            $comp       = $ev['competitions'][0] ?? [];
            $status     = $comp['status']['type'] ?? [];
            $competitors = $comp['competitors'] ?? [];
            $home = array_values(array_filter($competitors, fn($c) => $c['homeAway'] === 'home'))[0] ?? $competitors[0] ?? [];
            $away = array_values(array_filter($competitors, fn($c) => $c['homeAway'] === 'away'))[0] ?? $competitors[1] ?? [];
            $games[] = [
                'id'          => $ev['id'],
                'name'        => $ev['name'],
                'date'        => $ev['date'],
                'status'      => $status['description'] ?? '',
                'is_live'     => ($status['id'] ?? '') === '2',
                'is_final'    => ($status['id'] ?? '') === '3',
                'clock'       => $status['shortDetail'] ?? '',
                'home_team'   => $home['team']['abbreviation'] ?? '',
                'home_name'   => $home['team']['displayName']  ?? '',
                'home_score'  => $home['score'] ?? null,
                'away_team'   => $away['team']['abbreviation'] ?? '',
                'away_name'   => $away['team']['displayName']  ?? '',
                'away_score'  => $away['score'] ?? null,
            ];
        }
        respond(['league' => $league, 'game_count' => count($games), 'games' => $games]);
        break;

    case 'weather':
        $lat = (float) ($_GET['lat'] ?? 51.5074);
        $lon = (float) ($_GET['lon'] ?? -0.1278);
        $url = sprintf(
            'https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f'
            . '&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m,is_day'
            . '&wind_speed_unit=mph',
            $lat, $lon
        );
        $data    = cached_fetch($url);
        $current = $data['current'] ?? [];
        respond([
            'latitude'    => $lat,
            'longitude'   => $lon,
            'temperature' => $current['temperature_2m']       ?? null,
            'weathercode' => $current['weathercode']          ?? null,
            'windspeed'   => $current['windspeed_10m']        ?? null,
            'humidity'    => $current['relative_humidity_2m'] ?? null,
            'is_day'      => $current['is_day']               ?? 1,
            'unit'        => 'celsius',
        ]);
        break;

    case 'weather_all':
        $cities = [
            ['name' => 'London',    'lat' => 51.5074,  'lon' => -0.1278 ],
            ['name' => 'New York',  'lat' => 40.7128,  'lon' => -74.006 ],
            ['name' => 'Tokyo',     'lat' => 35.6762,  'lon' => 139.6503],
            ['name' => 'Dubai',     'lat' => 25.2048,  'lon' => 55.2708 ],
            ['name' => 'Sydney',    'lat' => -33.8688, 'lon' => 151.2093],
            ['name' => 'Sao Paulo', 'lat' => -23.5505, 'lon' => -46.6333],
        ];
        $result = [];
        foreach ($cities as $city) {
            $url = sprintf(
                'https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f'
                . '&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m,is_day'
                . '&wind_speed_unit=mph',
                $city['lat'], $city['lon']
            );
            $data    = cached_fetch($url);
            $current = $data['current'] ?? [];
            $result[] = [
                'city'        => $city['name'],
                'temperature' => $current['temperature_2m']       ?? null,
                'weathercode' => $current['weathercode']          ?? null,
                'windspeed'   => $current['windspeed_10m']        ?? null,
                'humidity'    => $current['relative_humidity_2m'] ?? null,
                'is_day'      => $current['is_day']               ?? 1,
            ];
        }
        respond(['cities' => $result]);
        break;
    default:
        respond([
            'name'      => 'AXIS Terminal API',
            'version'   => '1.0',
            'endpoints' => [
                'GET /api.php?endpoint=crypto'                          => 'All 4 crypto pairs (Binance)',
                'GET /api.php?endpoint=crypto_single&symbol=BTCUSDT'   => 'Single crypto pair',
                'GET /api.php?endpoint=stock&symbol=AAPL'              => 'Single stock quote (Finnhub)',
                'GET /api.php?endpoint=stocks'                         => 'All 8 stock quotes',
                'GET /api.php?endpoint=sports&league=nba'              => 'Live scores (ESPN) — nba/nfl/mlb/nhl/epl',
                'GET /api.php?endpoint=weather&lat=51.5&lon=-0.12'     => 'Weather for lat/lon (Open-Meteo)',
                'GET /api.php?endpoint=weather_all'                    => 'Weather for 6 major cities',
            ],
        ]);
        break;
}