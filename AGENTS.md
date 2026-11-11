# Proyecto: Servicio B — Atención de vales de combustible

## Contexto

- Curso: Sistemas Orientados a Servicios (UNP).
- Sistema: vales de combustible. Este repositorio implementa el **Servicio B**.
- El **Servicio A** (otro grupo) emite y autoriza los vales.
- El **Servicio B** consulta vales autorizados y registra su atención/consumo.
- La base PostgreSQL y su esquema fueron definidos por el profesor.
- Repo base: https://github.com/juan-chero-sandoval/Servicios-S3
- Los cambios del grupo deben ir a su propio fork/repo, no a `main` de Chero.

## Alcance del Servicio B

- Solo vales **AUTORIZADOS (estado 1)**, activos y sin consumo previo.
- Una sola atención por vale. Entregar menos galones también cierra el vale; no hay saldo reutilizable.
- Cantidad consumida ≤ cantidad emitida.
- Precio real positivo, hasta 2 decimales.
- Importe = cantidad × precio real, `HALF_UP` a 2 decimales; lo calcula el servidor.
- Lote atómico de hasta 20 vales; si uno falla, se revierte todo.
- `SELECT ... FOR UPDATE` y bloqueos ordenados por código para evitar doble consumo.
- Repetición de una atención: HTTP 409.
- Cantidad superior a la emitida: HTTP 422.
- Aislamiento por RUC del proveedor autenticado.
- El servidor asigna usuario, fecha (`America/Lima`) y `estado_vale=2`.

**No hace:** emisión, autorización, anulación, facturación, PDF ni conciliación contable.

## Base de datos

- Tabla principal: `vales` o `logis_vales`; se elige con `VALE_TABLE`.
- Catálogos: `zonal`, `localidad`, `centro_costo`, `persona`, `trabajador`,
  `proveedor`, `contrato_vale`, `unidad_maquinaria`, `estado_vale`.
- Estados: 0 EMITIDO, 1 AUTORIZADO, 2 CONSUMIDO, 3 USADO, 4 ANULADO.
- B solo actualiza: `estado_vale`, `fecha_consumo`, `cantidad_consumida`,
  `precio_real`, `importe`, `ticket`, `usuario`.
- Perfil `demo`: H2 persistente en `data/vales-demo`; crea y siembra datos simulados.
- Perfil `postgres`: PostgreSQL real; **no crea tablas ni siembra datos**.
- **Nunca ejecutar `demo-schema.sql` sobre la base administrativa.**
- Índices recomendados: `docs/indices-recomendados.sql` (revisar antes de aplicar).

## Arquitectura

- Java 21 + Spring Boot 3.5.7 + Gradle + Spring JDBC + Spring Security.
- Capas: `controller`, `service`, `domain`, `persistence`, `model`, `config`.
- El controller solo orquesta; las reglas viven en `domain`/`service`; el SQL en `persistence`.
- El frontend es MVC vanilla en `src/main/resources/static` (modelos, controladores y vistas pasivas).
- Errores centralizados en `ApiErrors` con el contrato `{status, mensaje}`.
- No agregar lógica de negocio al repositorio ni al controller.

## Seguridad

- Sesión + CSRF; rol `GRIFO`.
- Login local de demo (`operador` / `demo1234`); para el sistema final debe integrarse
  con la autenticación administrativa.
- `server.error.include-message=never`.
- `COOKIE_SECURE=true` en HTTPS; `false` en local por HTTP.
- Actuator expone solo `health`, sin detalles.
- Credenciales solo por variables de entorno; nunca en el repositorio.

## Comandos

```bash
# Demo H2
./gradlew bootRun
# http://127.0.0.1:8080/login.html

# Pruebas + JAR + cobertura
./gradlew check bootJar

# Gate del proyecto
make gate

# PostgreSQL real
export SPRING_PROFILES_ACTIVE=postgres
export DB_URL='jdbc:postgresql://localhost:5432/vales'
export DB_USER='usuario_del_servicio'
export DB_PASSWORD='...'
export OPERADOR_PASSWORD='...'
export VALE_TABLE='vales'
./gradlew bootRun
```

## Verificación actual

- 20 pruebas de integración: 10 para `vales` y 10 para `logis_vales`; 0 fallos.
- 28 verificaciones de dominio.
- 27 pruebas MVC de frontend con Node.
- Arranque H2 verificado en Docker.
- Conexión contra PostgreSQL administrativo: pendiente de dump/credenciales del profesor.
