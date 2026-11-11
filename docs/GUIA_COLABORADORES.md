# Guía para colaboradores

## Descargar el proyecto

El repositorio está en https://github.com/juan-chero-sandoval/Servicios-S3. Usa Git para conservar el historial y poder enviar cambios:

```bash
git clone https://github.com/juan-chero-sandoval/Servicios-S3.git
cd Servicios-S3
```

Sin Git, usa **Code → Download ZIP**, extrae el archivo y abre una terminal en la carpeta que contiene `build.gradle` y `gradlew`.

## Requisitos y ejecución

Instala JDK 21 y verifica que `java -version` y `javac -version` indiquen la versión 21. Configura `JAVA_HOME` para apuntar al JDK si tu equipo tiene varias versiones. La primera ejecución descarga Gradle y las bibliotecas de Spring; requiere acceso a los repositorios de dependencias desde tu terminal.

En Linux/macOS:

```bash
./gradlew bootRun
```

En Windows PowerShell:

```powershell
.\gradlew.bat bootRun
```

No es necesario instalar Node ni iniciar otro frontend. H2 viene como dependencia; no se necesita PostgreSQL para esta revisión.

Espera el mensaje `Started ValesApplication` y abre http://127.0.0.1:8080/login.html. Ingresa con **operador / demo1234**. Mantén la terminal abierta. Para detener el servidor, pulsa `Ctrl+C`. Gradle puede seguir mostrando un porcentaje mientras el servidor está activo: eso no significa que esté detenido.

La demo genera 100 unidades y 100 vales. El proveedor del operador tiene 98 vales; dos corresponden a otro proveedor para comprobar el aislamiento. La base se guarda en `data/vales-demo.mv.db` y conserva los consumos entre reinicios. Cada colaborador tiene su propia base; no se comparte mediante GitHub. Para empezar otra demo sin perder la anterior, detén la aplicación y renombra la carpeta `data` antes de volver a iniciar.

## Qué revisar

1. Inicia sesión y busca un vale autorizado por código, placa o nombre. Prueba el filtro de zonal y la paginación.
2. Abre el detalle: identifica unidad, trabajador, suministro, galones emitidos y precio referencial.
3. Atiende un vale con cantidad igual o menor a la emitida. Ingresa el precio real y ticket. El precio real se registra manualmente.
4. Comprueba el importe. Por ejemplo, 10.25 galones × S/ 16.90 debe producir S/ 173.23; usa un vale que tenga autorizados al menos 10.25 galones.
5. Revisa el vale en “Consumidos”: debe mostrar ticket, usuario, fecha y los valores ingresados.
6. Marca varios autorizados para registrar un lote. Cada uno requiere cantidad, precio y ticket.
7. Comprueba que no se permita consumir otra vez el mismo vale ni atender un emitido, usado o anulado.

El caso B aplica una sola atención por vale: una cantidad menor también cierra el vale y no genera saldo para otra entrega. No incluye emisión, autorización, anulación, facturación ni PDF.

## Ejecutar las pruebas y generar el JAR

Linux/macOS:

```bash
./gradlew check bootJar
```

Windows PowerShell:

```powershell
.\gradlew.bat check bootJar
```

El reporte de pruebas queda en `build/reports/tests/test/index.html`. Las pruebas de integración usan bases H2 en memoria independientes de `data/vales-demo`; incluyen atención, validaciones, sesión, CSRF, rollback y concurrencia para `vales` y `logis_vales`.

El archivo ejecutable queda en `build/libs/vales-atencion-1.0.0.jar`:

```bash
java -jar build/libs/vales-atencion-1.0.0.jar
```

Ejecuta el JAR desde una carpeta fija si quieres reutilizar la misma base H2, cuya ruta depende del directorio de trabajo.

En Linux/macOS con Bash, `./scripts/verificar-dominio.sh` comprueba reglas de negocio sin descargar dependencias. `python3 scripts/verificar-frontend.py` verifica la arquitectura y ejecuta 27 pruebas de modelos y controladores en Linux con JavaScriptCore GTK. Alternativamente, con Node.js instalado puedes ejecutar `node scripts/test-frontend.cjs`, sin instalar paquetes. Ambas son opciones para pruebas; no necesitas Node ni JavaScriptCore para usar la aplicación.

El estado de las comprobaciones realizadas durante la entrega está en [VERIFICACION.md](VERIFICACION.md).

## Estructura para revisar el código

| Ruta | Contenido |
| --- | --- |
| `src/main/resources/static` | HTML, estilos y puntos de entrada de la presentación MVC |
| `src/main/resources/static/js/views` | Renderizado del DOM y enlace de eventos (View) |
| `src/main/resources/static/js/controllers` | Acciones y coordinación de atención/login (Controller) |
| `src/main/resources/static/js/models` | Datos, estado de atención/login, borradores y reglas (Model) |
| `src/main/resources/static/js/core` | Cliente HTTP/CSRF |
| `src/main/java/pe/vales/controller` | Controladores HTTP y respuestas de error |
| `src/main/java/pe/vales/model` | Modelos de datos y DTO de atención |
| `src/main/java/pe/vales/service` | Transacción de atención individual o por lote |
| `src/main/java/pe/vales/domain` | Reglas y cálculo del importe |
| `src/main/java/pe/vales/persistence` | SQL parametrizado, consultas y bloqueo de filas |
| `src/main/java/pe/vales/config` | Seguridad, reloj y datos demo |
| `src/test/java/pe/vales` | Pruebas de integración |
| `docs/API.md` | Contrato HTTP y ejemplos |
| `docs/BASE_DE_DATOS.md` | Análisis y correspondencia con la base recibida |

La explicación del patrón, el flujo de datos y las reglas para mantener la separación están en [ARQUITECTURA_MVC.md](ARQUITECTURA_MVC.md).

Después de actualizar a esta versión, ejecuta `./gradlew clean bootRun` (Windows: `.\gradlew.bat clean bootRun`) y recarga el navegador para cargar los nuevos scripts. Los datos H2 existentes se conservan.

## Conectar PostgreSQL

Empieza revisando con la demo. Para una base PostgreSQL de desarrollo, sigue la sección correspondiente del [README](../README.md) y configura las variables indicadas en [configuracion.env.example](../configuracion.env.example). Spring no carga ese archivo automáticamente: configura las variables en la terminal o en la configuración de ejecución del IDE.

El perfil `postgres` necesita `DB_URL`, `DB_USER`, `DB_PASSWORD` y `OPERADOR_PASSWORD`; no crea tablas ni siembra datos. `VALE_TABLE` permite elegir `vales` o `logis_vales`. No ejecutes los scripts de demostración sobre la base administrativa. Las claves reales se configuran localmente y no se añaden a commits.

A y B comparten la base en esta integración: B lee vales que A ya emitió y autorizó. El operador/proveedor de la demo se configura por instancia; para varias cuentas reales debe conectarse con la autenticación administrativa.

## Problemas de arranque

| Síntoma | Qué comprobar |
| --- | --- |
| El navegador dice conexión rechazada | Busca `Started ValesApplication` en la terminal. Si no está, revisa el primer error de arranque. Mantén la terminal abierta y usa el puerto que aparezca en el log. |
| La primera ejecución está descargando archivos | Espera a que Gradle termine la descarga y Spring arranque. Abrir el navegador antes produce conexión rechazada. |
| Fallo de descarga, proxy, DNS o `Operation not permitted` | Comprueba el acceso a Internet desde tu terminal y las restricciones de tu entorno. La restricción observada en el entorno del agente no acredita el mismo problema en tu computadora. |
| `Permission denied` al ejecutar el wrapper | En Linux/macOS: `chmod +x gradlew` y vuelve a ejecutar. |
| Java no existe o la versión no corresponde | Instala JDK 21 y revisa `JAVA_HOME`, `java -version` y `javac -version`. |
| Puerto 8080 ocupado | Detén tu instancia anterior o configura otro puerto, como se indica abajo. |
| Error de conexión o variables faltantes en PostgreSQL | Revisa el perfil activo y las variables obligatorias; para la demo usa `demo`. |

Para usar el puerto 8081 en Linux/macOS:

```bash
PORT=8081 ./gradlew bootRun
```

En Windows PowerShell:

```powershell
$env:PORT="8081"
.\gradlew.bat bootRun
```

Luego abre http://127.0.0.1:8081/login.html. Para volver al puerto predeterminado, elimina esa variable de la terminal o configura `PORT=8080`.

## Enviar cambios para revisión

Si tienes permiso de escritura en este repositorio:

```bash
git switch main
git pull --ff-only origin main
git switch -c mejora/descripcion-del-cambio
```

Haz tus cambios, ejecuta las pruebas y añade solo los archivos que modificaste:

```bash
git add ruta/del/archivo
git commit -m "Describe el cambio"
git push -u origin mejora/descripcion-del-cambio
```

Abre un Pull Request hacia `main` y explica qué cambió, cómo probarlo y los resultados de las pruebas. Reemplaza los nombres de ejemplo de rama/archivo por los de tu cambio. Si no tienes permiso de escritura, crea un fork y envía el Pull Request desde ese fork. Puedes revisar y descargar el código público sin permiso de escritura; los permisos de colaboración se gestionan aparte en GitHub.

La base local, `.env`, logs y archivos generados están excluidos mediante `.gitignore`.
