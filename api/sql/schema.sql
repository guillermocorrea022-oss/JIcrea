-- ════════════════════════════════════════════════════════════════════════
--  JICREA — Software de Gestión · Base de datos MySQL (Hostinger)
--  Compatible con MySQL 8 y MariaDB 10.4+.
--
--  CÓMO USAR:
--   1. hPanel de Hostinger → Bases de datos → MySQL → crear una base + usuario.
--   2. Entrá a phpMyAdmin (botón "Administrar") → pestaña SQL.
--   3. Pegá TODO este archivo y ejecutá.
--   4. Después ejecutá seed.sql para el catálogo real.
--   5. Poné los datos de la base en api/config.php
-- ════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ── USUARIOS Y ROLES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(190),
  role          ENUM('dueno','operario') NOT NULL DEFAULT 'operario',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 01 LISTAS OFICIAL ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(190) NOT NULL UNIQUE,
  supply_type VARCHAR(190),
  zone        VARCHAR(190),
  contact     VARCHAR(190),
  notes       TEXT,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplies (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(190) NOT NULL UNIQUE,
  supplier_id         BIGINT NULL,
  unit_cost           DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit                VARCHAR(40) DEFAULT 'unidad',
  stock_inicial       DECIMAL(14,2) NOT NULL DEFAULT 0,
  low_stock_threshold DECIMAL(14,2) NOT NULL DEFAULT 0,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(190) NOT NULL UNIQUE,
  category            VARCHAR(120),
  cost                DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_mayor_a       DECIMAL(12,2) NULL,
  price_mayor_b       DECIMAL(12,2) NULL,
  price_minorista     DECIMAL(12,2) NULL,
  labor_cost          DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_st               TINYINT(1) NOT NULL DEFAULT 0,
  is_combo            TINYINT(1) NOT NULL DEFAULT 0,
  business            ENUM('mates','alpargatas') NOT NULL DEFAULT 'mates',
  stock_inicial       DECIMAL(14,2) NOT NULL DEFAULT 0,
  low_stock_threshold DECIMAL(14,2) NOT NULL DEFAULT 0,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_recipe (
  product_id  BIGINT NOT NULL,
  supply_id   BIGINT NOT NULL,
  qty         DECIMAL(12,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, supply_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS combo_components (
  combo_id      BIGINT NOT NULL,
  component_id  BIGINT NOT NULL,
  qty           DECIMAL(12,2) NOT NULL DEFAULT 1,
  PRIMARY KEY (combo_id, component_id),
  FOREIGN KEY (combo_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (component_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 04 CLIENTES (CRM) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(190) NOT NULL,
  client_type    ENUM('mayor_a','mayor_b','minorista','empresarial') NULL,
  locality       VARCHAR(190),
  zone           VARCHAR(190),
  responsible    VARCHAR(190),
  category       VARCHAR(120),
  contact        VARCHAR(190),
  notes          TEXT,
  last_contact   DATE NULL,
  weekly_contact TINYINT(1) NOT NULL DEFAULT 0,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 02 VENTAS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  client_id           BIGINT NULL,
  client_name         VARCHAR(190),
  client_contact      VARCHAR(190),
  sale_type           ENUM('mayor_a','mayor_b','minorista') NOT NULL DEFAULT 'minorista',
  business            ENUM('mates','alpargatas') NOT NULL DEFAULT 'mates',
  channel             VARCHAR(60),
  source              ENUM('manual','web') NOT NULL DEFAULT 'manual',
  status              ENUM('pendiente','confirmado','en_proceso','entregado','cancelado') NOT NULL DEFAULT 'confirmado',
  order_date          DATE NOT NULL,
  delivery_date       DATE NULL,
  paid                TINYINT(1) NOT NULL DEFAULT 0,
  paid_date           DATE NULL,
  zone                VARCHAR(190),
  shipping_info       TEXT,
  company             VARCHAR(120),
  commission_amount   DECIMAL(12,2) DEFAULT 0,
  notes               TEXT,
  total               DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_minorista_ref DECIMAL(14,2) DEFAULT 0,
  total_cost          DECIMAL(14,2) NOT NULL DEFAULT 0,
  is_historical       TINYINT(1) NOT NULL DEFAULT 0,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at        DATETIME NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
  INDEX idx_sales_status (status),
  INDEX idx_sales_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sale_items (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  sale_id      BIGINT NOT NULL,
  product_id   BIGINT NULL,
  product_name VARCHAR(190) NOT NULL,
  qty          DECIMAL(12,2) NOT NULL DEFAULT 1,
  unit_price   DECIMAL(12,2) NOT NULL DEFAULT 0,
  unit_cost    DECIMAL(12,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_items_sale (sale_id),
  INDEX idx_items_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 05-08 PRODUCCIÓN ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  module        ENUM('mates','cuero','costurera','grabados') NOT NULL DEFAULT 'mates',
  supplier_id   BIGINT NULL,
  supply_id     BIGINT NULL,
  supply_name   VARCHAR(190),
  qty           DECIMAL(14,2) NOT NULL DEFAULT 0,
  unit_price    DECIMAL(12,2) NOT NULL DEFAULT 0,
  total         DECIMAL(14,2) NOT NULL DEFAULT 0,
  order_number  VARCHAR(80),
  status        ENUM('pedido','a_levantar','recibido') NOT NULL DEFAULT 'pedido',
  paid          TINYINT(1) NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL,
  received_date DATE NULL,
  notes         TEXT,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE SET NULL,
  INDEX idx_pur_supply (supply_id),
  INDEX idx_pur_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS production (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  module          ENUM('mates','cuero','costurera','grabados') NOT NULL DEFAULT 'mates',
  product_id      BIGINT NULL,
  product_name    VARCHAR(190),
  qty             DECIMAL(14,2) NOT NULL DEFAULT 0,
  labor_unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  labor_total     DECIMAL(14,2) NOT NULL DEFAULT 0,
  prod_date       DATE NOT NULL,
  operator        VARCHAR(190),
  notes           TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  INDEX idx_prod_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS engraving_orders (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  entry_date  DATE NOT NULL,
  exit_date   DATE NULL,
  client_name VARCHAR(190),
  model       VARCHAR(190),
  qty         DECIMAL(12,2) NOT NULL DEFAULT 0,
  price       DECIMAL(12,2) NOT NULL DEFAULT 0,
  status      ENUM('pendiente','en_proceso','listo','entregado') NOT NULL DEFAULT 'pendiente',
  notes       TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id  BIGINT NULL,
  supply_id   BIGINT NULL,
  qty         DECIMAL(14,2) NOT NULL DEFAULT 0,
  reason      VARCHAR(255),
  adj_date    DATE NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── 09 PAGOS EMPRESA ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_payments (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  company         VARCHAR(120) NOT NULL DEFAULT 'Empresa 1',
  period_month    DATE NOT NULL,
  concept         VARCHAR(120) NOT NULL,
  amount          DECIMAL(12,2) NOT NULL DEFAULT 0,
  registered_date DATE NOT NULL,
  notes           TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment (company, period_month, concept)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ════════════════════════════════════════════════════════════════════════
--  VISTAS — STOCK Y FINANZAS (se recalculan solas)
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_product_sales_out AS
  SELECT si.product_id AS product_id, SUM(si.qty) AS qty_out
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE s.status IN ('confirmado','en_proceso','entregado')
    AND s.is_historical = 0 AND si.product_id IS NOT NULL
  GROUP BY si.product_id
  UNION ALL
  SELECT cc.component_id AS product_id, SUM(si.qty * cc.qty) AS qty_out
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  JOIN combo_components cc ON cc.combo_id = si.product_id
  WHERE s.status IN ('confirmado','en_proceso','entregado')
    AND s.is_historical = 0
  GROUP BY cc.component_id;

CREATE OR REPLACE VIEW v_product_stock AS
SELECT
  p.id, p.name, p.category, p.business, p.cost, p.price_mayor_a, p.price_mayor_b,
  p.price_minorista, p.is_st, p.is_active, p.low_stock_threshold, p.stock_inicial,
  p.stock_inicial
    + COALESCE((SELECT SUM(qty) FROM production pr WHERE pr.product_id = p.id), 0)
    - COALESCE((SELECT SUM(qty_out) FROM v_product_sales_out o WHERE o.product_id = p.id), 0)
    - COALESCE((SELECT SUM(qty) FROM inventory_adjustments a WHERE a.product_id = p.id), 0)
    AS stock_actual
FROM products p;

CREATE OR REPLACE VIEW v_supply_stock AS
SELECT
  su.id, su.name, su.unit, su.unit_cost, su.supplier_id,
  su.low_stock_threshold, su.stock_inicial,
  su.stock_inicial
    + COALESCE((SELECT SUM(qty) FROM purchases pu WHERE pu.supply_id = su.id AND pu.status = 'recibido'), 0)
    - COALESCE((SELECT SUM(pr.qty * r.qty) FROM production pr
                JOIN product_recipe r ON r.product_id = pr.product_id
                WHERE r.supply_id = su.id), 0)
    - COALESCE((SELECT SUM(qty) FROM inventory_adjustments a WHERE a.supply_id = su.id), 0)
    AS stock_actual
FROM supplies su;

CREATE OR REPLACE VIEW v_sales_monthly AS
SELECT
  DATE_FORMAT(order_date, '%Y-%m-01') AS period,
  business,
  SUM(total) AS facturacion,
  SUM(total - total_cost) AS margen_bruto,
  SUM(total_cost) AS costo_ventas,
  COUNT(*) AS cantidad_ventas
FROM sales
WHERE status IN ('confirmado','en_proceso','entregado')
GROUP BY DATE_FORMAT(order_date, '%Y-%m-01'), business;

CREATE OR REPLACE VIEW v_labor_monthly AS
SELECT DATE_FORMAT(prod_date, '%Y-%m-01') AS period, SUM(labor_total) AS mano_obra
FROM production GROUP BY DATE_FORMAT(prod_date, '%Y-%m-01');

CREATE OR REPLACE VIEW v_purchases_monthly AS
SELECT DATE_FORMAT(purchase_date, '%Y-%m-01') AS period, SUM(total) AS compras_insumos
FROM purchases WHERE status = 'recibido' GROUP BY DATE_FORMAT(purchase_date, '%Y-%m-01');

CREATE OR REPLACE VIEW v_fixed_costs_monthly AS
SELECT DATE_FORMAT(period_month, '%Y-%m-01') AS period, SUM(amount) AS costos_fijos
FROM company_payments GROUP BY DATE_FORMAT(period_month, '%Y-%m-01');

CREATE OR REPLACE VIEW v_cash_flow AS
SELECT
  m.period,
  COALESCE(s.facturacion, 0) AS ingresos,
  COALESCE(f.costos_fijos, 0) AS egresos_fijos,
  COALESCE(l.mano_obra, 0) AS mano_obra,
  COALESCE(pu.compras_insumos, 0) AS compras_insumos,
  COALESCE(s.facturacion,0) - COALESCE(f.costos_fijos,0)
    - COALESCE(l.mano_obra,0) - COALESCE(pu.compras_insumos,0) AS saldo_mensual
FROM (
  SELECT period FROM v_sales_monthly
  UNION SELECT period FROM v_labor_monthly
  UNION SELECT period FROM v_purchases_monthly
  UNION SELECT period FROM v_fixed_costs_monthly
) m
LEFT JOIN v_sales_monthly s ON s.period = m.period
LEFT JOIN v_fixed_costs_monthly f ON f.period = m.period
LEFT JOIN v_labor_monthly l ON l.period = m.period
LEFT JOIN v_purchases_monthly pu ON pu.period = m.period
ORDER BY m.period;

CREATE OR REPLACE VIEW v_accounts_receivable AS
SELECT s.id, s.client_name, s.client_id, s.order_date, s.total, s.business,
  DATEDIFF(CURDATE(), s.order_date) AS days_outstanding
FROM sales s
WHERE s.status IN ('confirmado','en_proceso','entregado') AND s.paid = 0;

CREATE OR REPLACE VIEW v_client_history AS
SELECT c.id AS client_id, c.name,
  COUNT(s.id) AS total_pedidos,
  COALESCE(SUM(s.total),0) AS total_facturado,
  MAX(s.order_date) AS ultima_compra
FROM clients c
LEFT JOIN sales s ON s.client_id = c.id
  AND s.status IN ('confirmado','en_proceso','entregado')
GROUP BY c.id, c.name;

CREATE OR REPLACE VIEW v_product_margins AS
SELECT si.product_id, si.product_name, s.business,
  SUM(si.qty) AS unidades_vendidas,
  SUM(si.qty * si.unit_price) AS facturado,
  SUM(si.qty * (si.unit_price - si.unit_cost)) AS margen_total
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE s.status IN ('confirmado','en_proceso','entregado')
GROUP BY si.product_id, si.product_name, s.business;

-- FIN. Ejecutá seed.sql para cargar el catálogo.
