# API del caso B

Base: `http://localhost:8080`. JSON UTF-8. Las consultas requieren sesión. Las escrituras requieren sesión con rol GRIFO y token CSRF. El usuario y proveedor se resuelven en el servidor; no se admiten en el cuerpo JSON.

## Inicio de sesión

1. `GET /api/csrf`: público; devuelve `{ "headerName": "X-CSRF-TOKEN", "parameterName": "_csrf", "token": "..." }` y establece la sesión. Conserva las cookies.
2. `POST /login`, contenido `application/x-www-form-urlencoded`: `username`, `password` y el parámetro CSRF obtenido. Devuelve 204 si es correcto, 401 si las credenciales son incorrectas.
3. Tras iniciar sesión, vuelve a consultar `GET /api/csrf`: el token cambia por seguridad. Usa el token nuevo y las cookies en las escrituras.
4. `POST /logout`: incluye el token CSRF en la cabecera indicada; devuelve 204.

El frontend hace estos pasos automáticamente. No se usa HTTP Basic ni se colocan credenciales en las URLs.

## Consultas

| Método y ruta | Respuesta |
| --- | --- |
| `GET /api/sesion` | Usuario, RUC asociado y `demo` |
| `GET /api/vales` | `{items, total, pagina, tamanio}` |
| `GET /api/vales/{codigo}` | Detalle de un vale del proveedor |
| `GET /api/zonales` | Lista `{codigo, nombre}` de zonas con vales del proveedor |
| `GET /api/resumen` | `total`, `autorizados`, `consumidos`, `importe` para el proveedor |

Parámetros de `/api/vales`: `estado` opcional de 0 a 4; `q` hasta 100 caracteres (busca código, placa o nombre); `zonal` opcional de dos dígitos; `pagina` desde 0; `tamanio` de 1 a 100 (predeterminado 15). Un proveedor no puede consultar vales de otro, aun conociendo su código.

Ejemplo: `/api/vales?estado=1&zonal=01&pagina=0&tamanio=15`.

El detalle contiene identificación y relaciones, `cantidadEmitida`, `precioReferencial`, `estadoVale`, `estado`, `activo`, `fechaEmision`, y los datos de atención cuando existen. Las fechas son valores locales de Lima, en ISO 8601 sin desplazamiento, de acuerdo con las columnas `TIMESTAMP` recibidas. El navegador las presenta como hora de Lima.

## Registrar una o varias atenciones

`POST /api/atenciones`, `Content-Type: application/json`, cookies de sesión y cabecera CSRF. Para atender un solo vale, envía un arreglo de un elemento.

```json
{
  "vales": [
    {
      "codigoVale": "2026110001",
      "cantidadConsumida": 10.25,
      "precioReal": 16.90,
      "ticket": "T001-00452"
    }
  ]
}
```

Usa un código devuelto por `GET /api/vales`; el ejemplo es ilustrativo. El código admite 1–10 dígitos. Cantidad y precio deben ser positivos, de hasta 12 enteros y 2 decimales. Se aceptan hasta 20 elementos distintos; cada vale lleva su cantidad, precio y ticket. Ticket: 1–15 caracteres, empieza por letra o número, y admite letras ASCII, números, espacio, guion, guion bajo y `/`.

Respuesta `201 Created`: arreglo de los detalles actualizados, ordenado por código. Para el ejemplo se guardan `importe: 173.23`, `estadoVale: 2`, usuario de sesión y fecha del servidor. El importe de referencia no interviene. No se añade ni se desglosa IGV en B.

Campos no reconocidos se rechazan. No se permite enviar `importe`, `usuario`, `fechaConsumo`, `estadoVale` o RUC para sobreescribir decisiones del servidor.

El lote entero se confirma o revierte. No se devuelve éxito parcial. No hay endpoint de autorizar: los vales deben llegar autorizados desde el flujo anterior.

## Errores

Los errores de validación/negocio usan `{ "status": 409, "mensaje": "..." }`. Los rechazos del filtro de seguridad pueden usar el formato de error predeterminado de Spring; comprueba siempre el código HTTP.

| HTTP | Significado |
| --- | --- |
| 400 | JSON, datos o parámetros inválidos, campos no permitidos |
| 401 | Falta sesión / credenciales incorrectas |
| 403 | Token CSRF ausente o inválido / rol sin permiso |
| 404 | Vale inexistente o de otro proveedor |
| 409 | Estado incompatible, consumo previo, inactividad o bloqueo concurrente |
| 422 | Cantidad superior a la emitida, importe fuera de rango o código repetido en lote |
| 503 | Fallo de acceso a la base de datos |

Si el cliente pierde la conexión después de enviar la atención, consulta cada vale antes de reintentar. Si el primer envío se confirmó, repetirlo devuelve 409 y no duplica el consumo.

## Comprobación manual

- Atiende 10.25 galones a S/ 16.90: verifica S/ 173.23.
- Intenta repetir el mismo vale: debe ser 409.
- Intenta atender uno EMITIDO, USADO o ANULADO: debe ser rechazado.
- Intenta superar la cantidad emitida: 422, sin cambios.
- Envía un lote de un autorizado y un emitido: 409; el autorizado debe permanecer sin consumir.
- Verifica con dos solicitudes concurrentes que solo una registra el vale.
- Cambia `VALE_TABLE` y ejecuta el mismo contrato sobre la variante correspondiente.

Estos casos están implementados también en las pruebas de integración de `src/test/java` para ambas tablas. Aún deben ejecutarse con las dependencias disponibles.
