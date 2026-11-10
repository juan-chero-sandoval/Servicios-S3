# Verificación de la entrega

## Ejecutado correctamente

- Compilación con `javac` y ejecución de `ConsumoPolicy`, `ReglaException` y el ejecutor independiente `PolicyCheck`: **28 comprobaciones**.
- Incluye cantidades completas y menores, HALF_UP, estados 0/2/3/4, inactividad, consumo previo, proveedor distinto, falta de cantidad de A, cantidad superior, valores nulos, cero/negativos, exceso de decimales y desbordamiento/importe inferior a un céntimo.
- Revisión de sintaxis de `app.js` y `login.js` con JavaScriptCore.
- **13 comprobaciones** de aritmética y formatos numéricos del frontend con JavaScriptCore. El cálculo usa enteros BigInt para evitar errores de redondeo en la vista previa.

## Preparado, pendiente de ejecución

Los contratos `AtencionValesTest` y `AtencionLogisTest` heredan diez pruebas de integración cada uno, con bases H2 independientes. Cubren HTTP, autenticación, CSRF, datos de emisión intactos, redondeo, validación, aislamiento por proveedor, filtros/paginación, duplicados, rollback de lote y dos hilos intentando consumir un mismo vale.

Las pruebas de integración siguen pendientes de ejecución confirmada. Al intentar ejecutarlas inicialmente desde el entorno del agente, la descarga de Gradle falló con `java.net.SocketException: Operation not permitted` por restricciones de red.

Posteriormente, el arranque desde la terminal del usuario confirmó la compilación y la conexión H2, tal como se detalla al final. Aún deben verificarse los recorridos de la interfaz, los contratos de integración y la conexión contra una base PostgreSQL de desarrollo. El comando para ello es `./gradlew test bootJar` (en Windows, `.\gradlew.bat test bootJar`).

## Alcance de las comprobaciones

Las pruebas independientes confirman las reglas puras y la aritmética JavaScript. No reemplazan las pruebas JDBC/transaccionales ni la revisión visual y de interacción de la aplicación completa.

## Actualización del arranque local

El 9 de noviembre de 2026, la ejecución desde la terminal del usuario confirmó `Started ValesApplication` y Tomcat en el puerto 8080, con conexión a H2. También se comprobó la existencia de la clase principal compilada y del archivo de la base de datos. Esta evidencia actualiza la limitación inicial sobre compilación y arranque; no acredita la ejecución de las pruebas de integración ni la conexión contra PostgreSQL.

## Reorganización MVVM

- Se ejecutaron correctamente **25 pruebas** de modelos y ViewModels con JavaScriptCore, utilizando las clases reales con dependencias de datos simuladas.
- Se comprobó la sintaxis de los scripts JavaScript, las referencias a archivos y selectores de las vistas, la ausencia de acceso al DOM en modelos/ViewModels y la ausencia de peticiones HTTP en las vistas.
- Se compilaron todas las clases Java principales con `javac` y las dependencias disponibles en caché. La compilación terminó correctamente; mantiene una advertencia previa sobre `AntPathRequestMatcher`.
- Se intentó `./gradlew test --offline --no-daemon`. Gradle no pudo iniciar su daemon porque este entorno rechaza el socket local (`SocketException: Operation not permitted`). No se afirma que las pruebas de integración hayan pasado.
- Se añadió al contrato de integración una comprobación de acceso sin sesión a la vista y a los scripts del login MVVM. Se ejecutará junto con las demás mediante `./gradlew test` en una terminal con permisos normales.
- La revisión completa en navegador de esta reorganización queda pendiente. Reiniciar `bootRun` y recargar la página permite probarla con la misma base H2 existente.
