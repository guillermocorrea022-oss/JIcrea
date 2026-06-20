# JIcrea · Software de Gestión

Sistema de gestión (ERP) para JIcrea: ventas, inventario, producción, finanzas,
clientes y reportes. Reemplaza las 9 planillas de Google Sheets con una app web
que funciona en cualquier dispositivo y se sincroniza en tiempo real.

- **Frontend**: web estática (sin instalación, se abre en el navegador). Vive en `admin/`.
- **Backend**: Supabase (base de datos Postgres + login + tiempo real). Gratis para empezar.

---

## ✅ Puesta en marcha (una sola vez, ~15 minutos)

### 1. Crear el proyecto en Supabase
1. Entrá a **https://supabase.com** y creá una cuenta (gratis).
2. **New project** → ponele un nombre (ej. `jicrea`), elegí una contraseña para la
   base de datos y la región más cercana (South America). Esperá 1-2 min a que se cree.

### 2. Cargar la base de datos
1. En tu proyecto: menú izquierdo → **SQL Editor** → **New query**.
2. Abrí el archivo **`supabase/schema.sql`**, copiá TODO el contenido, pegalo y tocá **Run**.
3. Repetí con **`supabase/seed.sql`** (carga el catálogo real de 60+ productos con precios).
   > ⚠️ `seed.sql` tiene los precios mayoristas. Está fuera del repo público a propósito.
   > Guardalo en un lugar privado.

### 3. Conectar la app
1. En Supabase: **Settings (⚙)** → **API** (o **Data API**). Copiá:
   - **Project URL**
   - **anon / public key** (es pública, está OK que se vea)
2. Abrí **`admin/js/config.js`** y pegá esos dos valores:
   ```js
   export const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJ...tu-anon-key...';
   ```

### 4. Crear tu usuario (dueño)
1. En Supabase: **Authentication** → **Users** → **Add user** → **Create new user**.
   Poné tu email y una contraseña. (Desmarcá "auto-confirm" solo si querés verificar por mail;
   para empezar, dejalo confirmado.)
2. Por defecto todo usuario nuevo entra como **operario**. Para que vos seas **dueño**:
   - **SQL Editor** → New query → ejecutá (poné tu email):
     ```sql
     update profiles set role = 'dueno'
     where id = (select id from auth.users where email = 'TU-EMAIL');
     ```
3. Para sumar un **operario** después: repetí el paso 1 (queda como operario, sin acceso a finanzas).

### 5. Abrir la app
- **Local**: abrí `admin/index.html` con un servidor local (no con doble-click; los módulos
  necesitan `http://`). Si ya usás el preview del sitio, entrá a `…/admin/`.
- **Online (recomendado)**: como el sitio se publica en GitHub Pages, la app queda en
  `https://TU-USUARIO.github.io/JIcrea/admin/`. Entrás con tu email y contraseña.

---

## 🛒 Conectar los pedidos de la web (opcional pero recomendado)

Para que los pedidos del carrito de la web aparezcan solos en el Dashboard:

1. Abrí **`js/web-order.js`** (en la raíz del sitio, no en `admin/`).
2. Completá el bloque `CFG` con tu **Project URL** y **anon key** (los mismos del paso 3).
3. Listo. Cuando un cliente toque **"Finalizar pedido"**, además de abrir WhatsApp,
   el pedido se guarda como **Pendiente** y aparece en tu Dashboard para confirmarlo o rechazarlo.

> Seguridad: la web solo manda nombres, cantidades y el precio minorista (lo que el cliente ve).
> Los precios mayoristas nunca salen de la app del dueño. El cliente anónimo no puede leer nada
> de la base, solo crear su pedido pendiente.

---

## 📦 Qué incluye

| Módulo | Qué hace |
|--------|----------|
| **Dashboard** | Métricas del mes, alertas de stock, pedidos web pendientes, últimas ventas |
| **Ventas** | Venta manual (precio y margen automáticos), lista con filtros, cuentas por cobrar |
| **Inventario** | Stock en tiempo real de productos e insumos, Ficha Técnica, mermas |
| **Producción** | Compras de insumos, productos terminados, mano de obra (Mates/Cuero/Costurera/Grabados) |
| **Finanzas** | Costos y ganancias, Flujo de Caja, Pagos Empresa *(solo dueño)* |
| **Clientes** | CRM, historial automático, TOP, contacto semanal |
| **Reportes** | Márgenes por producto, ventas por canal, evolución mensual, export CSV/PDF *(solo dueño)* |
| **Administración** | Catálogo, insumos, proveedores *(solo dueño)* |

## 🔑 Reglas clave ya implementadas
- El stock se calcula solo (Inicial + Entradas − Salidas), nunca se desfasa.
- Una compra suma stock **solo** cuando está "Recibido".
- Al registrar producción se descuentan los insumos según la Ficha Técnica.
- Al confirmar una venta se descuenta stock y suma a caja, en un paso.
- Los pedidos web entran "Pendientes" y no tocan nada hasta que el dueño confirma.
- El Flujo de Caja es solo lectura.
- Los precios mayoristas nunca se publican.

## 💾 Migrar tus datos históricos
- **Catálogo y precios**: ya vienen cargados con `seed.sql`.
- **Stock inicial**: cargalo en Administración (campo "Stock inicial" de cada producto/insumo)
  o en Inventario.
- **Clientes (109)**: se pueden cargar a mano en Clientes, o importar por CSV desde Supabase
  (Table Editor → tabla `clients` → Import).
- **Ventas históricas 2024/2025**: opcional, importables por CSV a la tabla `sales` + `sale_items`.

---
Hecho para JIcrea · 2026
