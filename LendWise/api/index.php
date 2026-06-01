<?php
/**
 * MortgageIQ — PHP + SQLite API
 * ─────────────────────────────────────────────────────────────
 * Full backend for saving/loading calculations from SQLite.
 * Deploy on any PHP 7.4+ host with SQLite3 extension enabled.
 *
 * Endpoints:
 *   GET  /api/index.php?action=list           — get all saved calcs
 *   POST /api/index.php?action=save           — save a calculation
 *   GET  /api/index.php?action=get&id=123     — get single calc
 *   DELETE /api/index.php?action=delete&id=123 — delete a calc
 *   GET  /api/index.php?action=clear          — delete all
 * ─────────────────────────────────────────────────────────────
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── DATABASE SETUP ────────────────────────────────────────────
define('DB_PATH', __DIR__ . '/../db/mortgageiq.sqlite');

function getDB(): SQLite3 {
  // Ensure db directory exists
  if (!is_dir(dirname(DB_PATH))) {
    mkdir(dirname(DB_PATH), 0755, true);
  }

  $db = new SQLite3(DB_PATH);
  $db->enableExceptions(true);

  // Create table if not exists
  $db->exec('
    CREATE TABLE IF NOT EXISTS calculations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      property_value REAL    NOT NULL,
      deposit        REAL    NOT NULL,
      principal      REAL    NOT NULL,
      interest_rate  REAL    NOT NULL,
      term_years     INTEGER NOT NULL,
      mortgage_type  TEXT    NOT NULL DEFAULT "repayment",
      monthly_payment REAL   NOT NULL,
      total_repayable REAL   NOT NULL,
      total_interest  REAL   NOT NULL,
      ltv            REAL    NOT NULL,
      label          TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime("now"))
    )
  ');

  return $db;
}

// ── HELPERS ───────────────────────────────────────────────────
function respond(array $data, int $status = 200): void {
  http_response_code($status);
  echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
  exit;
}

function rowToArray(array $row): array {
  return [
    'id'             => (int)   $row['id'],
    'propertyValue'  => (float) $row['property_value'],
    'deposit'        => (float) $row['deposit'],
    'principal'      => (float) $row['principal'],
    'interestRate'   => (float) $row['interest_rate'],
    'termYears'      => (int)   $row['term_years'],
    'mortgageType'   =>         $row['mortgage_type'],
    'monthlyPayment' => (float) $row['monthly_payment'],
    'totalRepayable' => (float) $row['total_repayable'],
    'totalInterest'  => (float) $row['total_interest'],
    'ltv'            => (float) $row['ltv'],
    'label'          =>         $row['label'] ?? null,
    'createdAt'      =>         $row['created_at'],
  ];
}

// ── ROUTING ───────────────────────────────────────────────────
$action = strtolower(trim($_GET['action'] ?? ''));
$method = $_SERVER['REQUEST_METHOD'];

try {
  $db = getDB();

  switch ($action) {

    // ── LIST ALL ─────────────────────────────────────────────
    case 'list':
      $result = $db->query('SELECT * FROM calculations ORDER BY created_at DESC LIMIT 50');
      $rows   = [];
      while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $rows[] = rowToArray($row);
      }
      respond(['success' => true, 'count' => count($rows), 'data' => $rows]);
      break;

    // ── SAVE ─────────────────────────────────────────────────
    case 'save':
      if ($method !== 'POST') respond(['error' => 'POST required'], 405);
      $body = json_decode(file_get_contents('php://input'), true);
      if (!$body) respond(['error' => 'Invalid JSON body'], 400);

      $required = ['propertyValue','deposit','principal','interestRate','termYears','monthlyPayment','totalRepayable','totalInterest','ltv'];
      foreach ($required as $key) {
        if (!isset($body[$key])) respond(['error' => "Missing field: $key"], 400);
      }

      $stmt = $db->prepare('
        INSERT INTO calculations
          (property_value, deposit, principal, interest_rate, term_years,
           mortgage_type, monthly_payment, total_repayable, total_interest, ltv, label)
        VALUES
          (:pv, :dep, :prin, :rate, :term, :type, :monthly, :total, :interest, :ltv, :label)
      ');
      $stmt->bindValue(':pv',       $body['propertyValue'],  SQLITE3_FLOAT);
      $stmt->bindValue(':dep',      $body['deposit'],         SQLITE3_FLOAT);
      $stmt->bindValue(':prin',     $body['principal'],       SQLITE3_FLOAT);
      $stmt->bindValue(':rate',     $body['interestRate'],    SQLITE3_FLOAT);
      $stmt->bindValue(':term',     $body['termYears'],       SQLITE3_INTEGER);
      $stmt->bindValue(':type',     $body['mortgageType'] ?? 'repayment', SQLITE3_TEXT);
      $stmt->bindValue(':monthly',  $body['monthlyPayment'],  SQLITE3_FLOAT);
      $stmt->bindValue(':total',    $body['totalRepayable'],  SQLITE3_FLOAT);
      $stmt->bindValue(':interest', $body['totalInterest'],   SQLITE3_FLOAT);
      $stmt->bindValue(':ltv',      $body['ltv'],             SQLITE3_FLOAT);
      $stmt->bindValue(':label',    $body['label'] ?? null,   SQLITE3_TEXT);
      $stmt->execute();

      $id = $db->lastInsertRowID();
      respond(['success' => true, 'id' => $id, 'message' => 'Calculation saved']);
      break;

    // ── GET SINGLE ───────────────────────────────────────────
    case 'get':
      $id   = (int)($_GET['id'] ?? 0);
      if (!$id) respond(['error' => 'id required'], 400);
      $stmt = $db->prepare('SELECT * FROM calculations WHERE id = :id');
      $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
      $result = $stmt->execute();
      $row    = $result->fetchArray(SQLITE3_ASSOC);
      if (!$row) respond(['error' => 'Not found'], 404);
      respond(['success' => true, 'data' => rowToArray($row)]);
      break;

    // ── DELETE ───────────────────────────────────────────────
    case 'delete':
      $id = (int)($_GET['id'] ?? 0);
      if (!$id) respond(['error' => 'id required'], 400);
      $stmt = $db->prepare('DELETE FROM calculations WHERE id = :id');
      $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
      $stmt->execute();
      respond(['success' => true, 'message' => 'Deleted']);
      break;

    // ── CLEAR ALL ────────────────────────────────────────────
    case 'clear':
      $db->exec('DELETE FROM calculations');
      respond(['success' => true, 'message' => 'All calculations deleted']);
      break;

    // ── DEFAULT / DOCS ───────────────────────────────────────
    default:
      respond([
        'api'     => 'MortgageIQ API',
        'version' => '1.0',
        'db'      => 'SQLite3',
        'endpoints' => [
          'GET  ?action=list'         => 'List all saved calculations',
          'POST ?action=save'         => 'Save a calculation (JSON body)',
          'GET  ?action=get&id=N'     => 'Get calculation by ID',
          'DELETE ?action=delete&id=N'=> 'Delete calculation by ID',
          'GET  ?action=clear'        => 'Delete all calculations',
        ]
      ]);
  }

} catch (Exception $e) {
  respond(['error' => 'Database error', 'message' => $e->getMessage()], 500);
}
