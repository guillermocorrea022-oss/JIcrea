<?php
// ════════════════════════════════════════════════════════════════════════
//  CONFIGURACIÓN — copiá este archivo como  config.php  y completá tus datos.
//
//  En hPanel de Hostinger → Bases de datos → MySQL vas a tener:
//    · Nombre de la base   (DB_NAME)   ej: u123456789_jicrea
//    · Usuario             (DB_USER)   ej: u123456789_admin
//    · Contraseña          (DB_PASS)
//    · Host                (DB_HOST)   normalmente 'localhost'
//
//  config.php NO se sube al repositorio público (está en .gitignore).
// ════════════════════════════════════════════════════════════════════════
return [
  'DB_HOST' => 'localhost',
  'DB_NAME' => 'TU_BASE',
  'DB_USER' => 'TU_USUARIO',
  'DB_PASS' => 'TU_CONTRASEÑA',
  // Orígenes permitidos para la web pública que manda pedidos (CORS).
  // Si la web y la app están en el mismo dominio, podés dejarlo como está.
  'ALLOWED_ORIGINS' => ['*'],
];
