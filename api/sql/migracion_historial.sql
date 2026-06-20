-- ════════════════════════════════════════════════════════════════════════
--  MIGRACIÓN — Ventas históricas (no descuentan stock actual).
--  Ejecutar UNA vez en phpMyAdmin, ANTES de importar jicrea-ventas.sql.
--  Las ventas marcadas is_historical=1 cuentan para finanzas y reportes,
--  pero NO se restan del inventario (el stock arranca del conteo físico).
-- ════════════════════════════════════════════════════════════════════════
SET NAMES utf8mb4;

ALTER TABLE sales ADD COLUMN is_historical TINYINT(1) NOT NULL DEFAULT 0;

-- El stock solo considera ventas NO históricas
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
