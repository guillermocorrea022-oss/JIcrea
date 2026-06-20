# -*- coding: utf-8 -*-
# Parser de COSTOS Y VENTAS gral -> ventas. Primero VALIDA totales por año.
import json, re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

SRC = r"C:\Users\Guill\.claude\projects\C--Users-Guill-OneDrive-Escritorio-jicrea-moderno\1e940f29-f34f-4565-bb11-97a1ee58d771\tool-results\mcp-4b3a7a3c-57d7-4fc9-9715-f9e956591f3e-read_file_content-1781996564421.txt"
lines = json.load(open(SRC, encoding='utf-8'))['fileContent'].split('\n')

def cells(ln): return [c.strip() for c in ln.strip().strip('|').split('|')]

def money(s):
    s = (s or '').strip().replace('$', '').replace(' ', '')
    if not s or s in ('-',): return 0.0
    s = s.replace('.', '').replace(',', '.')
    try: return float(s)
    except: return 0.0

def parse_date(s, cur_year):
    s = (s or '').strip()
    m = re.match(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$', s)
    if m:
        dd, mo, y = m.groups(); y = int(y)
        if y < 100: y += 2000
        return f"{y}-{int(mo):02d}-{int(dd):02d}", y
    m = re.match(r'^(\d{1,2})[/-](\d{1,2})$', s)  # sin año
    if m and cur_year:
        dd, mo = m.groups()
        return f"{cur_year}-{int(mo):02d}-{int(dd):02d}", cur_year
    return None, cur_year

PROD_START, PROD_END = 2, 68   # columnas de producto [2..67]
C_TOTAL, C_MARGIN, C_ESTADO, C_CANAL, C_PAGO = 69, 70, 71, 73, 74

sales = []
section = None
cur_year = None
header = None

for i, ln in enumerate(lines):
    cs = cells(ln)
    if not cs: continue
    c0 = cs[0] if len(cs) > 0 else ''
    c1 = cs[1] if len(cs) > 1 else ''
    up = ln.upper()
    if 'POR MENOR' in up: section = 'minorista'; continue
    if 'POR MAYOR' in up: section = 'mayor_a'; continue
    if c0.upper().startswith('CIERRE'):
        m = re.search(r'(20\d{2})', c0)
        if m: cur_year = int(m.group(1)) + 1  # lo que sigue es el año próximo
        continue
    if c0 == 'FECHA DE PEDIDO' or c0 == 'Fecha' or c0.startswith(':-') or 'FECHA DE PEDIDO/CLIENTE' in up:
        header = cs; continue
    # ¿fila de venta? total numérico y (fecha o cliente)
    if len(cs) <= C_TOTAL: continue
    total = money(cs[C_TOTAL])
    if total <= 0: continue
    if not c1 and not re.match(r'^\d', c0): continue
    if 'CIERRE' in (c0+c1).upper(): continue
    d, cur_year = parse_date(c0, cur_year)
    if d is None and cur_year is None:
        continue  # sin año determinable
    year = cur_year
    margin = money(cs[C_MARGIN]) if len(cs) > C_MARGIN else 0
    cost = max(0.0, total - margin)
    estado = (cs[C_ESTADO] if len(cs) > C_ESTADO else '').upper()
    pago = (cs[C_PAGO] if len(cs) > C_PAGO else '').upper()
    items = []
    if header:
        for col in range(PROD_START, min(PROD_END, len(cs), len(header))):
            v = cs[col]
            if v and re.match(r'^\d+(\.\d+)?$', v) and float(v) > 0:
                items.append((header[col], float(v)))
    sales.append({'date': d, 'year': year, 'client': c1, 'type': section or 'minorista',
                  'total': total, 'cost': cost, 'estado': estado, 'pago': pago, 'items': items})

# ── VALIDACIÓN ────────────────────────────────────────────────────────────
from collections import defaultdict
by_year = defaultdict(float); cnt_year = defaultdict(int)
for s in sales:
    by_year[s['year']] += s['total']; cnt_year[s['year']] += 1
print("=== VENTAS PARSEADAS:", len(sales), "===")
for y in sorted(k for k in by_year if k):
    print(f"  {y}: {cnt_year[y]:4d} ventas   ${by_year[y]:,.0f}")
print("  (sin año):", cnt_year.get(None,0))
print()
print("=== CONTROL (esperado de la planilla/spec) ===")
print("  2024: $325.355 | 2025: $1.984.125")
print("  2026 (ene-may): 554.606+234.828+604.130+395.106+417.340 = $2.206.010")
sin_items = sum(1 for s in sales if not s['items'])
print("\nVentas sin ítems detectados:", sin_items)
print("Ejemplos:")
for s in sales[:3]+sales[-3:]:
    print(" ", s['date'], s['type'], s['client'][:18], '$%.0f'%s['total'], len(s['items']),'items')
