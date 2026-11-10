# Verificación de la entrega

## Actualización 10/11/2026

- `gradle check bootJar` con Gradle 8.14.6 y JDK 21: **BUILD SUCCESSFUL**.
- **20 pruebas de integración**: 10 para `vales` y 10 para `logis_vales`; 0 fallos.
- **28 verificaciones de dominio**; 0 fallos.
- **27 pruebas MVC de frontend** con Node; 0 fallos.
- Arranque H2 en Docker y `GET /actuator/health`: HTTP 200 con `{"status":"UP"}` sin detalles.
- Conexión contra PostgreSQL administrativo: pendiente de dump o credenciales del profesor.

## Ejecutado correctamente

- Compilación con `javac` y ejecución de `ConsumoPolicy`, `ReglaException` y el ejecutor independiente `PolicyCheck`: **28 comprobaciones**.
- Incluye cantidades completas y menores, HALF_UP, estados 0/2/3/4, inactividad, consumo previo, proveedor distinto, falta de cantidad de A, cantidad superior, valores nulos, cero/negativos, exceso de decimales y desbordamiento/importe inferior a un céntimo.
- Revisión de sintaxis de `app.js` y `login.js` con JavaScriptCore.
- **13 comprobaciones** de aritmética y formatos numéricos del frontend con JavaScriptCore. El cálculo usa enteros BigInt para evitar errores de redondeo en la vista previa.

## Pruebas de integración

Los contratos `AtencionValesTest` y `AtencionLogisTest` heredan diez pruebas de integración cada uno, con bases H2 independientes. Cubren HTTP, autenticación, CSRF, datos de emisión intactos, redondeo, validación, aislamiento por proveedor, filtros/paginación, duplicados, rollback de lote y dos hilos intentando consumir un mismo vale.

Se ejecutaron el 10/11/2026 con `gradle check bootJar`: **20 pruebas, 0 fallos**. La primera ejecución desde el entorno del agente había fallado por restricciones de red; la ejecución actual con Docker/Gradle 8.14.6 y JDK 21 quedó confirmada. La conexión contra una base PostgreSQL administrativa sigue pendiente de credenciales o dump.

## Alcance de las comprobaciones

Las pruebas independientes confirman las reglas puras y la aritmética JavaScript. No reemplazan las pruebas JDBC/transaccionales ni la revisión visual y de interacción de la aplicación completa.

## Actualización del arranque local

El 9 de noviembre de 2026, la ejecución desde la terminal del usuario confirmó `Started ValesApplication` y Tomcat en el puerto 8080, con conexión a H2. También se comprobó la existencia de la clase principal compilada y del archivo de la base de datos. Esta evidencia actualiza la limitación inicial sobre compilación y arranque; no acredita la ejecución de las pruebas de integración ni la conexión contra PostgreSQL.

## Reorganización MVC

- Se ejecutaron correctamente **27 pruebas** de modelos y controladores con JavaScriptCore, utilizando clases reales, una vista espía y dependencias de datos simuladas.
- Se comprobó la sintaxis de los scripts, las referencias a archivos y selectores, la ausencia de DOM en modelos/controladores y la ausencia de peticiones HTTP en las vistas. Las pruebas comprueban la dirección explícita del renderizado desde el controlador.
- Se compilaron todas las clases Java principales con `javac` y las dependencias en caché, incluyendo los paquetes `controller`, `model` y `model/dto`. Se reemplazó `AntPathRequestMatcher` por un `RequestMatcher` lambda; el build ya no emite esa advertencia.
- Las pruebas completas de Spring se ejecutaron el 10/11/2026: 20 pruebas de integración, 0 fallos.
- El contrato de integración comprueba el acceso sin sesión a la vista y los scripts del login MVC; se ejecutó con `./gradlew check`.
- El arranque H2 de esta versión se verificó en Docker y el healthcheck respondió 200. La revisión visual completa en navegador sigue recomendada.
