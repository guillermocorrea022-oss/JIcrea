<?php
// ════════════════════════════════════════════════════════════════════════
//  JICREA API — router único. Todas las rutas entran por acá (.htaccess).
// ════════════════════════════════════════════════════════════════════════
require_once __DIR__ . '/lib.php';

// CORS (por si la web pública vive en otro origen)
$cfg = require __DIR__ . '/config.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && ($cfg['ALLOWED_ORIGINS'] === ['*'] || in_array($origin, $cfg['ALLOWED_ORIGINS']))) {
  header("Access-Control-Allow-Origin: $origin");
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Parseo de ruta ─────────────────────────────────────────────────────────
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = preg_replace('#^.*/api/?#', '', $uri);          // saca todo hasta /api/
$seg = array_values(array_filter(explode('/', $uri)));
$method = $_SERVER['REQUEST_METHOD'];
$r0 = $seg[0] ?? '';
$r1 = $seg[1] ?? null;
$r2 = $seg[2] ?? null;
$q = fn($k, $d = null) => $_GET[$k] ?? $d;

try {
  // ═══ AUTH ═══════════════════════════════════════════════════════════════
  if ($r0 === 'auth') {
    if ($r1 === 'login' && $method === 'POST') {
      $b = body();
      $st = db()->prepare("SELECT * FROM users WHERE email = ?");
      $st->execute([trim($b['email'] ?? '')]);
      $u = $st->fetch();
      if (!$u || !password_verify($b['password'] ?? '', $u['password_hash'])) fail('Email o contraseña incorrectos', 401);
      $_SESSION['uid'] = $u['id']; $_SESSION['email'] = $u['email'];
      $_SESSION['name'] = $u['full_name']; $_SESSION['role'] = $u['role'];
      json(['user' => current_user()]);
    }
    if ($r1 === 'logout' && $method === 'POST') { session_destroy(); json(['ok' => true]); }
    if ($r1 === 'me') {
      $count = db_all("SELECT COUNT(*) c FROM users")[0]['c'];
      json(['user' => current_user(), 'needs_setup' => (int)$count === 0]);
    }
    if ($r1 === 'setup' && $method === 'POST') {
      // Crea el PRIMER usuario (dueño) solo si la base no tiene usuarios.
      $count = db_all("SELECT COUNT(*) c FROM users")[0]['c'];
      if ($count > 0) fail('Ya existe un usuario. Usá login.', 403);
      $b = body();
      if (!filter_var($b['email'] ?? '', FILTER_VALIDATE_EMAIL) || strlen($b['password'] ?? '') < 6)
        fail('Email válido y contraseña de 6+ caracteres requeridos');
      $st = db()->prepare("INSERT INTO users (email,password_hash,full_name,role) VALUES (?,?,?,'dueno')");
      $st->execute([trim($b['email']), password_hash($b['password'], PASSWORD_DEFAULT), $b['full_name'] ?? 'Dueño']);
      json(['ok' => true]);
    }
    fail('Ruta de auth no encontrada', 404);
  }

  // ═══ USUARIOS (solo dueño) ════════════════════════════════════════════════
  if ($r0 === 'users') {
    require_owner();
    if ($method === 'GET') json(db_all("SELECT id,email,full_name,role,created_at FROM users ORDER BY created_at"));
    if ($method === 'POST') {
      $b = body();
      if (!filter_var($b['email'] ?? '', FILTER_VALIDATE_EMAIL) || strlen($b['password'] ?? '') < 6) fail('Datos inválidos');
      $role = ($b['role'] ?? 'operario') === 'dueno' ? 'dueno' : 'operario';
      $st = db()->prepare("INSERT INTO users (email,password_hash,full_name,role) VALUES (?,?,?,?)");
      $st->execute([trim($b['email']), password_hash($b['password'], PASSWORD_DEFAULT), $b['full_name'] ?? '', $role]);
      json(['ok' => true], 201);
    }
  }

  // ═══ PEDIDO WEB (público, sin login) ══════════════════════════════════════
  if ($r0 === 'web-order' && $method === 'POST') {
    $b = body();
    $cart = $b['cart'] ?? [];
    if (!$cart) fail('Carrito vacío');
    $info = $b['info'] ?? [];
    $total = isset($info['total']) ? (float)$info['total']
      : array_sum(array_map(fn($i) => ($i['price'] ?? 0) * ($i['qty'] ?? 0), $cart));
    $pdo = db(); $pdo->beginTransaction();
    $st = $pdo->prepare("INSERT INTO sales (source,status,sale_type,channel,client_name,client_contact,order_date,total,total_minorista_ref)
      VALUES ('web','pendiente','minorista','Web',?,?,CURDATE(),?,?)");
    $st->execute([$info['name'] ?? 'Pedido web', $info['contact'] ?? null, $total, $total]);
    $sid = $pdo->lastInsertId();
    $si = $pdo->prepare("INSERT INTO sale_items (sale_id,product_name,qty,unit_price,unit_cost) VALUES (?,?,?,?,0)");
    foreach ($cart as $i) $si->execute([$sid, $i['name'] ?? '?', $i['qty'] ?? 1, $i['price'] ?? 0]);
    $pdo->commit();
    json(['ok' => true, 'id' => $sid], 201);
  }

  // ═══ LECTURAS (requieren login) ═══════════════════════════════════════════
  $reads = [
    'product_stock' => "SELECT * FROM v_product_stock ORDER BY name",
    'supply_stock'  => "SELECT * FROM v_supply_stock ORDER BY name",
    'client_history'=> "SELECT * FROM v_client_history",
    'product_margins'=> "SELECT * FROM v_product_margins",
    'cash_flow'     => "SELECT * FROM v_cash_flow ORDER BY period",
    'sales_monthly' => "SELECT * FROM v_sales_monthly ORDER BY period",
    'receivable'    => "SELECT * FROM v_accounts_receivable ORDER BY days_outstanding DESC",
    'suppliers'     => "SELECT * FROM suppliers ORDER BY name",
    'engraving'     => "SELECT * FROM engraving_orders ORDER BY entry_date DESC",
    'company_payments' => "SELECT * FROM company_payments ORDER BY period_month DESC",
  ];
  if (isset($reads[$r0]) && $method === 'GET' && !$r1) { require_login(); json(db_all($reads[$r0])); }

  // Finanzas / reportes: solo dueño
  if (in_array($r0, ['cash_flow','sales_monthly','product_margins']) && $method === 'GET') require_owner();

  // ── products ──────────────────────────────────────────────────────────────
  if ($r0 === 'products') {
    if ($method === 'GET' && !$r1) { require_login();
      $rows = db_all("SELECT * FROM products ORDER BY category, name");
      if ($q('active')) $rows = array_values(array_filter($rows, fn($p) => $p['is_active']));
      json($rows);
    }
    if ($r1 && $r2 === 'recipe') {
      require_login();
      if ($method === 'GET') json(db_all("SELECT * FROM product_recipe WHERE product_id=?", [$r1]));
      if ($method === 'PUT') { require_owner();
        $rows = body()['rows'] ?? [];
        $pdo = db(); $pdo->beginTransaction();
        $pdo->prepare("DELETE FROM product_recipe WHERE product_id=?")->execute([$r1]);
        $ins = $pdo->prepare("INSERT INTO product_recipe (product_id,supply_id,qty) VALUES (?,?,?)");
        foreach ($rows as $row) if (!empty($row['supply_id'])) $ins->execute([$r1, $row['supply_id'], $row['qty'] ?? 0]);
        $pdo->commit(); json(['ok' => true]);
      }
    }
    if ($r1 && $r2 === 'combo') {
      require_login();
      if ($method === 'GET') json(db_all("SELECT * FROM combo_components WHERE combo_id=?", [$r1]));
      if ($method === 'PUT') { require_owner();
        $rows = body()['rows'] ?? [];
        $pdo = db(); $pdo->beginTransaction();
        $pdo->prepare("DELETE FROM combo_components WHERE combo_id=?")->execute([$r1]);
        $ins = $pdo->prepare("INSERT INTO combo_components (combo_id,component_id,qty) VALUES (?,?,?)");
        foreach ($rows as $row) if (!empty($row['component_id'])) $ins->execute([$r1, $row['component_id'], $row['qty'] ?? 1]);
        $pdo->commit(); json(['ok' => true]);
      }
    }
    if ($method === 'POST' && !$r1) { require_owner(); json(db_insert('products', body()), 201); }
    if ($method === 'PATCH' && $r1) { require_owner(); json(db_update('products', $r1, body())); }
  }

  // ── supplies ────────────────────────────────────────────────────────────
  if ($r0 === 'supplies') {
    if ($method === 'GET' && !$r1) { require_login();
      json(db_all("SELECT s.*, sup.name AS supplier_name FROM supplies s LEFT JOIN suppliers sup ON sup.id=s.supplier_id ORDER BY s.name")); }
    if ($method === 'POST') { require_owner(); json(db_insert('supplies', body()), 201); }
    if ($method === 'PATCH' && $r1) { require_owner(); json(db_update('supplies', $r1, body())); }
  }

  // ── suppliers ─────────────────────────────────────────────────────────────
  if ($r0 === 'suppliers') {
    if ($method === 'POST') { require_owner(); json(db_insert('suppliers', body()), 201); }
    if ($method === 'PATCH' && $r1) { require_owner(); json(db_update('suppliers', $r1, body())); }
  }

  // ── clients ───────────────────────────────────────────────────────────────
  if ($r0 === 'clients') {
    if ($method === 'GET' && !$r1) { require_login(); json(db_all("SELECT * FROM clients ORDER BY name")); }
    if ($method === 'POST') { require_login(); json(db_insert('clients', body()), 201); }
    if ($method === 'PATCH' && $r1) { require_login(); json(db_update('clients', $r1, body())); }
  }

  // ── sales ───────────────────────────────────────────────────────────────
  if ($r0 === 'sales') {
    require_login();
    if ($r1 && $r2 === 'items' && $method === 'GET')
      json(db_all("SELECT * FROM sale_items WHERE sale_id=?", [$r1]));
    if ($r1 === 'pending' && $method === 'GET')
      json(db_all("SELECT * FROM sales WHERE status='pendiente' ORDER BY created_at DESC"));
    if ($r1 === 'recent' && $method === 'GET')
      json(db_all("SELECT s.*, c.name AS client_db_name FROM sales s LEFT JOIN clients c ON c.id=s.client_id
        WHERE s.status IN ('confirmado','en_proceso','entregado') ORDER BY s.created_at DESC LIMIT " . (int)($q('n', 12))));
    if ($method === 'GET' && !$r1) {
      $w = ["1=1"]; $p = [];
      foreach (['status' => 'status', 'source' => 'source', 'sale_type' => 'sale_type'] as $k => $col)
        if ($q($k) !== null && $q($k) !== '') { $w[] = "$col=?"; $p[] = $q($k); }
      if ($q('from')) { $w[] = "order_date>=?"; $p[] = $q('from'); }
      if ($q('to')) { $w[] = "order_date<=?"; $p[] = $q('to'); }
      if ($q('paid') !== null && $q('paid') !== '') { $w[] = "paid=?"; $p[] = $q('paid') === 'true' ? 1 : 0; }
      json(db_all("SELECT s.*, c.name AS client_db_name FROM sales s LEFT JOIN clients c ON c.id=s.client_id
        WHERE " . implode(' AND ', $w) . " ORDER BY order_date DESC, s.id DESC", $p));
    }
    if ($method === 'POST' && !$r1) {
      $b = body(); $sale = $b['sale'] ?? []; $items = $b['items'] ?? [];
      $total = array_sum(array_map(fn($i) => $i['qty'] * $i['unit_price'], $items));
      $cost = array_sum(array_map(fn($i) => $i['qty'] * $i['unit_cost'], $items));
      $sale['total'] = $total; $sale['total_cost'] = $cost;
      $pdo = db(); $pdo->beginTransaction();
      $row = db_insert('sales', $sale);
      $si = $pdo->prepare("INSERT INTO sale_items (sale_id,product_id,product_name,qty,unit_price,unit_cost) VALUES (?,?,?,?,?,?)");
      foreach ($items as $i) $si->execute([$row['id'], $i['product_id'] ?: null, $i['product_name'], $i['qty'], $i['unit_price'], $i['unit_cost']]);
      $pdo->commit(); json($row, 201);
    }
    if ($method === 'PATCH' && $r1) json(db_update('sales', $r1, body()));
  }

  // ── purchases ─────────────────────────────────────────────────────────────
  if ($r0 === 'purchases') {
    require_login();
    if ($method === 'GET' && !$r1) {
      $w = "1=1"; $p = [];
      if ($q('module')) { $w = "p.module=?"; $p[] = $q('module'); }
      json(db_all("SELECT p.*, s.name AS supplier_name FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id WHERE $w ORDER BY p.purchase_date DESC, p.id DESC", $p));
    }
    if ($method === 'POST') { $b = body(); $b['total'] = ($b['qty'] ?? 0) * ($b['unit_price'] ?? 0); json(db_insert('purchases', $b), 201); }
    if ($method === 'PATCH' && $r1) json(db_update('purchases', $r1, body()));
  }

  // ── production ──────────────────────────────────────────────────────────
  if ($r0 === 'production') {
    require_login();
    if ($method === 'GET' && !$r1) {
      $w = "1=1"; $p = [];
      if ($q('module')) { $w = "module=?"; $p[] = $q('module'); }
      json(db_all("SELECT * FROM production WHERE $w ORDER BY prod_date DESC, id DESC", $p));
    }
    if ($method === 'POST') { $b = body(); $b['labor_total'] = ($b['qty'] ?? 0) * ($b['labor_unit_cost'] ?? 0); json(db_insert('production', $b), 201); }
  }

  // ── engraving ───────────────────────────────────────────────────────────
  if ($r0 === 'engraving') {
    require_login();
    if ($method === 'POST') json(db_insert('engraving_orders', body()), 201);
    if ($method === 'PATCH' && $r1) json(db_update('engraving_orders', $r1, body()));
  }

  // ── adjustments (mermas) ──────────────────────────────────────────────────
  if ($r0 === 'adjustments') {
    require_login();
    if ($method === 'GET') json(db_all("SELECT a.*, p.name AS product_name, su.name AS supply_name
      FROM inventory_adjustments a LEFT JOIN products p ON p.id=a.product_id LEFT JOIN supplies su ON su.id=a.supply_id ORDER BY a.adj_date DESC"));
    if ($method === 'POST') json(db_insert('inventory_adjustments', body()), 201);
  }

  // ── company_payments (solo dueño para escribir) ───────────────────────────
  if ($r0 === 'company_payments') {
    if ($method === 'POST') { require_owner();
      try { json(db_insert('company_payments', body() + ['registered_date' => date('Y-m-d')]), 201); }
      catch (PDOException $e) { fail($e->getCode() === '23000' ? 'Ya existe ese concepto para ese mes y empresa.' : 'Error', 409); } }
    if ($method === 'DELETE' && $r1) { require_owner(); db()->prepare("DELETE FROM company_payments WHERE id=?")->execute([$r1]); json(['ok' => true]); }
  }

  fail('Ruta no encontrada: ' . $uri, 404);

} catch (PDOException $e) {
  fail('Error de base de datos', 500);
} catch (Throwable $e) {
  fail('Error del servidor', 500);
}
