# Atención de vales de combustible — Servicio B

Aplicación con arquitectura **MVC**, Java 21 + Spring Boot 3.5.7, Spring JDBC, Spring Security y frontend HTML/CSS/JavaScript servido por la misma aplicación. Se limita a validar y registrar la **atención de vales autorizados**.

## Descargar y ejecutar la demo

Requisitos: **JDK 21** (incluye `java` y `javac`), Git para clonar y acceso a Internet durante la primera ejecución. Comprueba `java -version` y `javac -version`. No hace falta instalar Gradle, Maven, Node ni PostgreSQL para la demo: el repositorio incluye Gradle Wrapper.

### Linux / macOS

```bash
git clone https://github.com/juan-chero-sandoval/Servicios-S3.git
cd Servicios-S3
./gradlew bootRun
```

### Windows — PowerShell

```powershell
git clone https://github.com/juan-chero-sandoval/Servicios-S3.git
cd Servicios-S3
.\gradlew.bat bootRun
```

También puedes descargar **Code → Download ZIP** en GitHub, extraerlo y abrir una terminal en la carpeta que contiene `build.gradle`. En Linux/macOS, si aparece `Permission denied`, ejecuta `chmod +x gradlew`.

**Espera a que aparezcan `Tomcat started on port 8080` y `Started ValesApplication`. Mantén la terminal abierta** mientras usas la aplicación; detén el servidor con `Ctrl+C`. Que Gradle permanezca ejecutando `bootRun` es normal.

Abre **http://127.0.0.1:8080/login.html**. Usuario: **operador**. Contraseña de demostración: **demo1234**. Cada colaborador ejecuta su propia aplicación y base local. Subir el código a GitHub no aloja el backend ni comparte los datos de tu computadora.

Guía de revisión, solución de problemas y flujo de contribuciones: [docs/GUIA_COLABORADORES.md](docs/GUIA_COLABORADORES.md).

El perfil predeterminado `demo` crea una base H2 persistente en `data/vales-demo`. Simula los datos producidos por A: 100 unidades, 100 vales, trabajadores, proveedores, suministros identificados por código y los distintos estados. Dos vales corresponden a otro proveedor, por lo que el operador ve inicialmente 98. Los registros persisten al reiniciar; el sembrado no reemplaza vales existentes.

La base adjunta enumera **seis zonales**, aunque el enunciado menciona cinco. La demo incluye las seis, con localidades de demostración coherentes. Todos los datos nuevos y las atenciones iniciales están identificados como simulados. No se conecta a la base administrativa en modo demo.

## Uso

1. Ingresa y consulta “Por atender”. Busca por código, placa o nombre, o filtra por zonal.
2. Abre un detalle y pulsa “Atender este vale”, o marca varios vales y pulsa “Revisar atención”. Máximo 20 por lote.
3. Registra los galones efectivamente entregados, el precio real por galón y el ticket de cada vale. El precio referencial solo se consulta en el detalle; no se utiliza para completar el precio real.
4. Revisa el importe y confirma. El backend calcula el importe, asigna usuario/fecha y cambia `AUTORIZADO (1)` a `CONSUMIDO (2)`.
5. Consulta la pestaña “Consumidos” y el detalle para verificar cantidad, precio, importe, ticket, usuario y fecha.

**Regla asumida:** cada vale admite una sola atención. Se permite entregar menos de lo emitido; el vale igualmente queda consumido, sin saldo reutilizable. Esta regla se comunica antes de registrar. Atenciones parciales acumulables requieren un modelo de detalle distinto, porque la tabla recibida solo permite almacenar una atención por vale.

El precio real se ingresa **manualmente**. No se ha proporcionado una API de precios del grifo. El servidor calcula `cantidad_consumida × precio_real`, con dos decimales y redondeo HALF_UP; no acepta un importe, usuario o fecha enviados por el navegador.

## Conexión con la base PostgreSQL administrativa

Se analizan ambos adjuntos en [docs/BASE_DE_DATOS.md](docs/BASE_DE_DATOS.md). Se utiliza por defecto `vales`, definida en `base_datos Vales (1).txt`. **No ejecutes los scripts de creación de la demo sobre tu base administrativa.** El perfil `postgres` no crea tablas ni inserta datos simulados.

Configura las variables en la terminal que iniciará la aplicación:

```bash
export SPRING_PROFILES_ACTIVE=postgres
export DB_URL='jdbc:postgresql://localhost:5432/vales'
export DB_USER='usuario_del_servicio'
# Configura DB_PASSWORD y OPERADOR_PASSWORD mediante tu gestor de secretos o entorno.
export OPERADOR_USUARIO='operador'
export OPERADOR_RUC='20100032458'
export VALE_TABLE='vales'
./gradlew bootRun
```

`DB_PASSWORD` y `OPERADOR_PASSWORD` son obligatorias en PostgreSQL; no hay contraseña demo como alternativa en este perfil. El usuario debe contener 1–8 caracteres alfanuméricos para respetar `usuario VARCHAR(8)`; la contraseña debe tener al menos 8 caracteres. El RUC debe tener 11 dígitos. El archivo [configuracion.env.example](configuracion.env.example) enumera las variables; la aplicación **no carga archivos `.env` automáticamente**.

Si A registra en `logis_vales`, configura **`VALE_TABLE=logis_vales`**. Se adaptan los nombres de precio y unidad, y se valida también `estado=true`. Las tablas de catálogo deben tener los nombres sin prefijo definidos en el segundo adjunto. No se mezclan ni sincronizan las dos tablas de vales.

A y B comparten PostgreSQL: A inserta y autoriza; B consulta esos mismos registros y actualiza únicamente los campos de atención. No se necesita duplicar A ni implementar una API de emisión. La demo reemplaza su dependencia mediante un sembrado aislado en el perfil `demo`.

La aplicación está configurada para un operador y un proveedor por instancia. El RUC y el usuario se obtienen de la configuración y de la sesión, nunca del cuerpo de la atención. Para varios operadores simultáneos con cuentas distintas, conecta `SecurityConfig` con la autenticación de tu sistema administrativo y resuelve el RUC desde el usuario autenticado. La cuenta incluida no sustituye ese sistema de identidades.

## API y reglas

Contrato y ejemplo de consumo: [docs/API.md](docs/API.md).

- Requiere sesión y CSRF para registrar. La contraseña se compara mediante BCrypt.
- Solo acepta vales autorizados, activos cuando la tabla dispone de ese indicador, y sin campos de consumo previos.
- Cantidad y precio positivos, con hasta dos decimales. La cantidad no puede superar lo emitido; el importe debe caber en `NUMERIC(14,2)` y ser al menos S/ 0.01.
- Guarda la fecha del servidor en `America/Lima`, compatible con los `TIMESTAMP` del esquema.
- Bloquea las filas mediante `SELECT … FOR UPDATE` en una transacción. Dos solicitudes no pueden consumir el mismo vale.
- El lote es atómico: si un elemento falla, todos los cambios se revierten. Los bloqueos se adquieren ordenados por código.
- Una repetición posterior devuelve `409`, sin crear un segundo consumo. Si se pierde la respuesta por una interrupción, consulta el vale antes de reintentar.

La aplicación escucha inicialmente solo en `127.0.0.1`. `SERVER_ADDRESS` y `PORT` permiten configurar la dirección y puerto del despliegue. La configuración de un servidor compartido, HTTPS e identidades corporativas corresponde al entorno donde se integrará el servicio.

## Organización del código

La aplicación utiliza **Model–View–Controller (MVC)** para atención y login:

| Capa | Ubicación | Responsabilidad |
| --- | --- | --- |
| Model | Java `model/`, `domain/`, `service/`, `persistence/` y JavaScript `static/js/models/` | Datos, reglas, estado y operaciones de sesión/vales |
| View | HTML, CSS y `static/js/views/` | Presenta datos y expone los eventos de la interfaz |
| Controller | Java `controller/` y JavaScript `static/js/controllers/` | Recibe peticiones/acciones, coordina el modelo y dirige las respuestas o el renderizado |
| Infraestructura | `static/js/core/api-client.js` y Java `config/` | Transporte HTTP/CSRF y configuración de seguridad/base de datos |

En el navegador, el controlador conecta eventos mediante `view.bind(actions)` y actualiza la pantalla con `view.render(model.snapshot())`. El estado y las validaciones de borradores viven en el modelo. La vista es pasiva y no se suscribe al estado ni realiza peticiones HTTP. Los puntos de entrada conectan las dependencias.

Spring MVC expone la API JSON desde `controller/ValeController.java`. `model/Vale.java`, `model/PaginaVales.java` y `model/dto/AtencionRequest.java` definen los datos; los servicios y repositorios implementan el caso de uso y el acceso JDBC. Spring Boot sirve las vistas y la API en el mismo puerto. Las vistas se renderizan en el navegador. Más detalles: [docs/ARQUITECTURA_MVC.md](docs/ARQUITECTURA_MVC.md).

## Verificación

```bash
./scripts/verificar-dominio.sh
python3 scripts/verificar-frontend.py
./gradlew test bootJar
```

En Windows, ejecuta `.\gradlew.bat test bootJar`; los scripts `.sh` requieren Bash. El primer comando usa exclusivamente el JDK. El segundo requiere JavaScriptCore GTK instalado en Linux y comprueba sintaxis, separación de capas y 27 pruebas de modelos/controladores; no es una prueba de navegador. Si tienes Node.js instalado, puedes ejecutar las mismas 27 pruebas con `node scripts/test-frontend.cjs`, sin instalar paquetes. Node es opcional y no se necesita para usar la aplicación. `gradlew test` ejecuta los contratos HTTP/JDBC para `vales` y `logis_vales` sobre H2, incluyendo rollback y solicitudes concurrentes. El JAR se genera en `build/libs/vales-atencion-1.0.0.jar`; se inicia con `java -jar build/libs/vales-atencion-1.0.0.jar` y las mismas variables de entorno.

**Estado de verificación:** pasaron 28 comprobaciones del dominio, la revisión de sintaxis y separación de capas, y 27 pruebas de modelos/controladores MVC. Se compilaron todas las clases Java principales con las dependencias disponibles. El arranque con H2 de la versión previa fue confirmado desde la terminal del usuario. El arranque de esta reorganización MVC, las pruebas completas de integración, los recorridos de interfaz y PostgreSQL administrativo siguen pendientes de verificación en una terminal que permita abrir sockets. Consulta [docs/VERIFICACION.md](docs/VERIFICACION.md).

No se implementan emisión, autorización, facturación, anulación ni PDF. Los estados ajenos al consumo se muestran únicamente para validar el flujo del caso B.
