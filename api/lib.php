<?php
// ════════════════════════════════════════════════════════════════════════
//  Helpers: sesión, respuestas JSON, auth, roles y CRUD con whitelist.
// ════════════════════════════════════════════════════════════════════════
require_once __DIR__ . '/db.php';

session_set_cookie_params([
  'lifetime' => 60 * 60 * 24 * 30,  // 30 días
  'path' => '/',
  'httponly' => true,
  'samesite' => 'Lax',
  'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
]);
session_start();

function json($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data);
  exit;
}
function fail($msg, $code = 400) { json(['error' => $msg], $code); }

function body() {
  $raw = file_get_contents('php://input');
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

// ── Auth ──────────────────────────────────────────────────────────────────
function current_user() {
  if (empty($_SESSION['uid'])) return null;
  return ['id' => $_SESSION['uid'], 'email' => $_SESSION['email'] ?? '',
          'full_name' => $_SESSION['name'] ?? '', 'role' => $_SESSION['role'] ?? 'operario'];
}
function require_login() { $u = current_user(); if (!$u) fail('No autorizado', 401); return $u; }
function require_owner() { $u = require_login(); if ($u['role'] !== 'dueno') fail('Solo el dueño puede hacer esto', 403); return $u; }
function is_owner() { $u = current_user(); return $u && $u['role'] === 'dueno'; }

// ── Columnas permitidas por tabla (whitelist anti-inyección) ───────────────
$GLOBALS['COLS'] = [
  'suppliers' => ['name','supply_type','zone','contact','notes','is_active'],
  'supplies'  => ['name','supplier_id','unit_cost','unit','stock_inicial','low_stock_threshold','is_active'],
  'products'  => ['name','category','cost','price_mayor_a','price_mayor_b','price_minorista','labor_cost','is_st','is_combo','stock_inicial','low_stock_threshold','is_active'],
  'clients'   => ['name','client_type','locality','zone','responsible','category','contact','notes','last_contact','weekly_contact','is_active'],
  'sales'     => ['client_id','client_name','client_contact','sale_type','channel','source','status','order_date','delivery_date','paid','paid_date','zone','shipping_info','company','commission_amount','notes','total','total_minorista_ref','total_cost','confirmed_at'],
  'sale_items'=> ['sale_id','product_id','product_name','qty','unit_price','unit_cost'],
  'purchases' => ['module','supplier_id','supply_id','supply_name','qty','unit_price','total','order_number','status','paid','purchase_date','received_date','notes'],
  'production' => ['module','product_id','product_name','qty','labor_unit_cost','labor_total','prod_date','operator','notes'],
  'engraving_orders' => ['entry_date','exit_date','client_name','model','qty','price','status','notes'],
  'inventory_adjustments' => ['product_id','supply_id','qty','reason','adj_date'],
  'company_payments' => ['company','period_month','concept','amount','registered_date','notes'],
];

function pick($table, $data) {
  $cols = $GLOBALS['COLS'][$table] ?? [];
  $out = [];
  foreach ($cols as $c) if (array_key_exists($c, $data)) $out[$c] = $data[$c];
  return $out;
}

function db_insert($table, $data) {
  $data = pick($table, $data);
  if (!$data) fail('Sin datos para guardar');
  $cols = array_keys($data);
  $ph = array_map(fn($c) => ":$c", $cols);
  $sql = "INSERT INTO `$table` (`" . implode('`,`', $cols) . "`) VALUES (" . implode(',', $ph) . ")";
  $st = db()->prepare($sql);
  $st->execute($data);
  $id = db()->lastInsertId();
  return db_get($table, $id);
}

function db_update($table, $id, $data) {
  $data = pick($table, $data);
  if (!$data) return db_get($table, $id);
  $sets = implode(',', array_map(fn($c) => "`$c`=:$c", array_keys($data)));
  $data['__id'] = $id;
  $st = db()->prepare("UPDATE `$table` SET $sets WHERE id=:__id");
  $st->execute($data);
  return db_get($table, $id);
}

function db_get($table, $id) {
  $st = db()->prepare("SELECT * FROM `$table` WHERE id=:id");
  $st->execute([':id' => $id]);
  return $st->fetch() ?: null;
}

function db_all($sql, $params = []) {
  $st = db()->prepare($sql);
  $st->execute($params);
  return $st->fetchAll();
}
