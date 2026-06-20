# JIcrea · Software de Gestión (Hostinger)

ERP para JIcrea: ventas, inventario, producción, finanzas, clientes y reportes.
Corre 100% en tu hosting de Hostinger: archivos + base de datos MySQL, sin
servicios externos.

- **Frontend**: web estática en `admin/` (la interfaz que usás).
- **Backend**: API en PHP en `api/` + base de datos MySQL.
- Todo bajo un solo dominio: `tudominio.com` (web) y `tudominio.com/admin` (gestión).

---

## ✅ Puesta en marcha en Hostinger (una vez)

### 1. Subir los archivos
Subí el contenido del proyecto a `public_html` (por el Administrador de archivos
de hPanel o por FTP). Te tiene que quedar:
```
public_html/
├── index.html, tienda.html, ...   (la web pública)
├── admin/                         (el sistema de gestión)
└── api/                           (el backend PHP)
```

### 2. Crear la base de datos MySQL
1. hPanel → **Bases de datos → MySQL**.
2. Creá una base nueva y un usuario (anotá nombre de base, usuario y contraseña).
3. Entrá a **phpMyAdmin** (botón "Administrar") → seleccioná tu base → pestaña **SQL**.
4. Pegá y ejecutá **`api/sql/schema.sql`** (crea tablas y vistas).
5. Pegá y ejecutá **`api/sql/seed.sql`** (carga el catálogo real de 60+ productos).
   > ⚠️ `seed.sql` tiene los precios mayoristas. No está en el repo público a propósito.

### 3. Conectar la API a la base
Editá **`api/config.php`** con los datos del paso 2:
```php
return [
  'DB_HOST' => 'localhost',
  'DB_NAME' => 'u123456789_jicrea',
  'DB_USER' => 'u123456789_admin',
  'DB_PASS' => 'tu-contraseña',
  'ALLOWED_ORIGINS' => ['*'],
];
```
> `config.php` no se sube al repo público (está en `.gitignore`) porque tiene la
> contraseña. Lo editás directo en Hostinger.

### 4. Crear tu usuario (dueño)
1. Entrá a **`tudominio.com/admin`**.
2. La primera vez te muestra **"Primera puesta en marcha"** → completá tu nombre,
   email y contraseña → **Crear cuenta de dueño**. Listo, quedás como dueño.
3. Para sumar un **operario** después: dentro del sistema (cuando agreguemos la
   pantalla de usuarios) o creándolo a mano. Por ahora el dueño es suficiente.

### 5. Conectar los pedidos de la web
Ya está conectado: como la web y la API comparten dominio, cuando un cliente toca
**"Finalizar pedido"** el pedido se guarda como **Pendiente** y aparece en tu
Dashboard. (Si la web estuviera en otro dominio, se define `window.JICREA_API_BASE`.)

---

## 🧪 Probar en tu computadora antes de subir (opcional)
La app necesita PHP + MySQL para funcionar. Si querés probarla local antes de
subirla, hay que tener PHP instalado. La forma más simple es instalar
**XAMPP** (trae Apache + PHP + MySQL): poné el proyecto en `htdocs/`, creás la
base en phpMyAdmin local, y entrás a `http://localhost/jicrea/admin`.
Si no, se prueba directo en Hostinger (es el entorno real).

---

## 📦 Módulos
Dashboard · Ventas (+ cuentas por cobrar) · Inventario (+ Ficha Técnica + mermas)
· Producción (Mates/Cuero/Costurera/Grabados) · Finanzas · Clientes (CRM) ·
Reportes (CSV/PDF) · Administración (catálogo, insumos, proveedores).

## 🔑 Reglas implementadas
- Stock calculado solo (Inicial + Entradas − Salidas), nunca se desfasa.
- Compra suma stock solo al estar "Recibido".
- Producción descuenta insumos por Ficha Técnica.
- Confirmar venta descuenta stock y suma a caja en un paso.
- Pedidos web entran "Pendientes" y no tocan nada hasta confirmar.
- Flujo de Caja solo lectura. Precios mayoristas nunca públicos.

## 💾 Migrar datos
- Catálogo y precios: ya cargados con `seed.sql`.
- Stock inicial, clientes (109), ventas históricas: se cargan desde la app o
  por **Importar CSV** en phpMyAdmin (tablas `clients`, `sales`, `sale_items`).

---
Hecho para JIcrea · 2026
