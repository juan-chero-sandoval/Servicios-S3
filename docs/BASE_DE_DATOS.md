# Análisis de los adjuntos y uso para el servicio B

Se revisaron `/home/chero/Descargas/base_datos Vales.txt` y `/home/chero/Descargas/base_datos Vales (1).txt`. El motor es PostgreSQL: el primer archivo incluye `CREATE DATABASE ... OWNER postgres`, tipos `SERIAL`, `NUMERIC` y configuración regional de Windows.

## Diferencias encontradas

El primer archivo declara `zonal`, `localidad`, `centro_costo` y `unidad_maquinaria`, pero varias claves foráneas apuntan a nombres `logis_*` que no declara. Contiene además dos caracteres de Markdown sueltos antes de un `CREATE TABLE`. Su instrucción de base de datos usa `Spanish_Peru.1252`, que depende de la plataforma.

El segundo archivo corrige esos nombres y define **dos tablas de vales alternativas**, no una relación cabecera/detalle. Repite la inserción de los estados, lo que provocaría claves duplicadas si se ejecuta literalmente. No se ejecuta ninguno de los adjuntos automáticamente.

| Concepto | `vales` (predeterminada) | `logis_vales` (opcional) |
| --- | --- | --- |
| Código | `codigo_vale VARCHAR(10)` | Igual |
| Precio referencial | `precio_contrato` | `precio` |
| Unidad | `codigo_unidad_movil` | `codigo_unidad` |
| Fecha de autorización | `fecha_autorizacion` | `fecha_operacion_autorizacion` |
| Indicador de actividad | No existe | `estado BOOLEAN` |
| Estado del comprobante | Entero | Booleano |
| Campos de atención | Los siete indicados más abajo | Iguales |

Se selecciona la tabla con `VALE_TABLE`. La lista de nombres admitidos es cerrada, para que esta configuración no introduzca identificadores SQL arbitrarios. B no crea vales, correlativos ni autorizaciones. Su código se acepta como cadena numérica de 1–10 caracteres; los datos demo usan `YYYYMM####`, sin imponer ese formato a A.

## Tablas que utiliza B

| Tabla | Uso |
| --- | --- |
| `vales` **o** `logis_vales` | Lee emisión/autorización y registra consumo. Única tabla modificada por B. |
| `estado_vale` | Descripción de estados: 0 EMITIDO, 1 AUTORIZADO, 2 CONSUMIDO, 3 USADO, 4 ANULADO. |
| `proveedor` | Muestra razón social. El RUC de la sesión limita todas las consultas y escrituras. |
| `unidad_maquinaria` | Muestra placa y tipo de vehículo. |
| `trabajador`, `persona` | Muestra el trabajador asignado por A. Es distinto del usuario del grifo que registra la atención. |
| `zonal`, `localidad` | Datos y filtros territoriales del vale. |

`centro_costo`, `contrato_vale` y `unidad_organizativa` se conservan para la estructura de A y sus claves foráneas; B no las modifica. Un contrato ausente debe almacenarse como `NULL`; “S/C” se usa al mostrarlo. Insertar literalmente `S/C` en una columna con FK exige un registro de contrato coincidente.

No se recibió la tabla de bienes/suministros. Se muestra `id_suministro` tal como viene de A; **no se inventa una tabla de bienes ni una relación con un catálogo inexistente**. En la demo se usan códigos claramente simulados `GASOHOL-REG` y `DIESEL-B5`.

No hay tablas de usuarios en los adjuntos. Se incluye autenticación configurable por entorno con un operador por instancia, que debe integrarse con la autenticación administrativa para usar varias cuentas reales.

## Escritura de atención

En una única transacción, B bloquea el vale del proveedor autenticado, valida la atención y actualiza exclusivamente:

| Columna | Origen / valor |
| --- | --- |
| `estado_vale` | `2` (CONSUMIDO) |
| `fecha_consumo` | Reloj del servidor en America/Lima |
| `cantidad_consumida` | Galones ingresados y validados, hasta la cantidad emitida |
| `precio_real` | Precio del grifo ingresado al atender |
| `importe` | Cantidad × precio, redondeado HALF_UP a dos decimales |
| `ticket` | Ingresado, hasta 15 caracteres; se recorta y normaliza a mayúsculas |
| `usuario` | Usuario autenticado, máximo 8 caracteres |

El estado `3 (USADO)` se conserva como un estado distinto; B no lo equipara con AUTORIZADO ni lo modifica. Los totales del frontend se rotulan expresamente como acumulados de estado 2. No representan conciliación contable ni facturación.

La tabla ya admite una atención completa: no hace falta una tabla nueva para el caso B. Con el esquema actual, consumir menos de lo emitido cierra el vale. Admitir varias entregas exigiría un detalle de atenciones y una política de saldo, que no se presupone.

No se actualizan precio referencial, cantidad emitida, trabajador, contrato, observación de A, fecha de autorización, campos de factura o anulación. No se exige un ticket único por proveedor porque el enunciado no establece esa regla y un ticket podría incluir más de un vale. La protección contra doble consumo se realiza por el código de vale.

## Datos demo y conexión real

`demo-schema.sql` reproduce las estructuras del segundo adjunto con creación repetible. `DemoData` siembra catálogos y vales solo con el perfil `demo`. No se utiliza sobre PostgreSQL administrativo. El script `esquema-postgres-limpio.sql` sirve únicamente para crear una base **nueva de pruebas**, sin la configuración regional de Windows ni inserciones duplicadas.

El adjunto contiene seis zonas y varias localidades con códigos de zona que no coinciden con su nombre (por ejemplo, CHULUCANAS enlazada a `04`, que el catálogo identifica como SULLANA). La demo usa sus propias localidades coherentes y no intenta corregir los datos administrativos. Debe revisarse esa correspondencia en el sistema fuente.

La conexión real usa `postgres`, que desactiva toda inicialización SQL. La implementación soporta ambas variantes de la tabla de vales del segundo adjunto, con catálogos sin prefijo. Si la base instalada tiene todos los catálogos con prefijo `logis_`, habrá que ajustar esos nombres en el repositorio de consultas tras confirmar el esquema real; las referencias inconsistentes del primer archivo no acreditan que esas tablas existan.
