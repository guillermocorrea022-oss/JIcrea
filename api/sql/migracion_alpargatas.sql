-- ════════════════════════════════════════════════════════════════════════
--  MIGRACIÓN — Separar "Alpargatas" como unidad de negocio aparte.
--  Ejecutar en phpMyAdmin UNA vez (si ya creaste la base con el schema viejo).
--  Para instalaciones nuevas ya viene incluido en schema.sql.
-- ════════════════════════════════════════════════════════════════════════
SET NAMES utf8mb4;

-- 1. Campo de negocio en productos y ventas
ALTER TABLE products ADD COLUMN business ENUM('mates','alpargatas') NOT NULL DEFAULT 'mates';
ALTER TABLE sales    ADD COLUMN business ENUM('mates','alpargatas') NOT NULL DEFAULT 'mates';

-- 2. Marcar las alpargatas como su propio negocio
UPDATE products SET business = 'alpargatas' WHERE category = 'Alpargatas';

-- 3. Vistas actualizadas (llevan el negocio para poder filtrar)
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

CREATE OR REPLACE VIEW v_product_margins AS
SELECT si.product_id, si.product_name, s.business,
  SUM(si.qty) AS unidades_vendidas,
  SUM(si.qty * si.unit_price) AS facturado,
  SUM(si.qty * (si.unit_price - si.unit_cost)) AS margen_total
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE s.status IN ('confirmado','en_proceso','entregado')
GROUP BY si.product_id, si.product_name, s.business;

CREATE OR REPLACE VIEW v_accounts_receivable AS
SELECT s.id, s.client_name, s.client_id, s.order_date, s.total, s.business,
  DATEDIFF(CURDATE(), s.order_date) AS days_outstanding
FROM sales s
WHERE s.status IN ('confirmado','en_proceso','entregado') AND s.paid = 0;
