package pe.vales.config;
import java.math.BigDecimal;
import java.time.*;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component @Profile("demo")
public class DemoData implements ApplicationRunner {
    private final JdbcTemplate jdbc;
    private final String table, ruc;
    private final Clock clock;
    public DemoData(JdbcTemplate jdbc, Clock clock, @Value("${app.vale-table}") String table, @Value("${app.operador.ruc}") String ruc) {
        if (!java.util.Set.of("vales","logis_vales").contains(table)) throw new IllegalArgumentException("Tabla inválida");
        this.jdbc=jdbc; this.clock=clock; this.table=table; this.ruc=ruc;
    }
    @Override @Transactional public void run(ApplicationArguments args) {
        if(jdbc.queryForObject("SELECT count(*) FROM "+table,Long.class)>0) return;
        if(jdbc.queryForObject("SELECT count(*) FROM zonal",Long.class)==0) {
            String[] zonas={"PIURA","CHULUCANAS","PAITA","SULLANA","TALARA","SECHURA"};
            String[] codigos={"01","02","03","04","05","08"};
            for(int i=0;i<zonas.length;i++) {
                jdbc.update("INSERT INTO zonal VALUES (?,?)",codigos[i],zonas[i]);
                jdbc.update("INSERT INTO localidad VALUES (?,?,?)",codigos[i],zonas[i]+" · DEMO",codigos[i]);
            }
            jdbc.update("INSERT INTO proveedor VALUES (?,?)",ruc,"GRIFO DEMOSTRACIÓN · DATOS SIMULADOS");
            jdbc.update("INSERT INTO proveedor VALUES (?,'OTRO PROVEEDOR · DEMO')",ruc.equals("20999999999")?"20888888888":"20999999999");
            jdbc.update("INSERT INTO centro_costo VALUES ('90211101','OPERACIONES · DEMO')");
            jdbc.update("INSERT INTO unidad_organizativa VALUES ('0800','OPERACIONES · DEMO',TRUE)");
            String[] nombres={"Carlos","Rosa","Miguel","Lucía","José","Ana","Pedro","Elena","Luis","María"};
            for(int i=1;i<=10;i++) {
                jdbc.update("INSERT INTO persona(codigo_persona,nombre,ap_paterno,ap_materno) VALUES (?,?,?,?)",i,nombres[i-1],"Operador","Demo");
                jdbc.update("INSERT INTO trabajador VALUES (?, ?, TRUE, '90211101','0800')",String.format(Locale.ROOT,"700000%02d",i),i);
            }
            String[] estados={"EMITIDO","AUTORIZADO","CONSUMIDO","USADO","ANULADO"};
            for(int i=0;i<5;i++) jdbc.update("INSERT INTO estado_vale VALUES (?,?)",i,estados[i]);
            for(int i=1;i<=100;i++) jdbc.update("INSERT INTO unidad_maquinaria(codigo,descripcion,tipo_vehiculo,placa) VALUES (?,?,?,?)",i,
                "Unidad móvil DEMO "+i, new String[]{"Motocar","Automóvil","Camioneta"}[(i-1)%3],String.format(Locale.ROOT,"DEM-%03d",i));
        }
        var now=LocalDateTime.now(clock).withNano(0);
        String[] zonas={"01","02","03","04","05","08"};
        for(int i=1;i<=100;i++) {
            String codigo=String.format(Locale.ROOT,"%04d%02d%04d",now.getYear(),now.getMonthValue(),i);
            int estado=i<=70?1:(i<=80?0:(i<=90?2:(i<=95?4:3)));
            BigDecimal cantidad=new BigDecimal(5+(i%8)*5), precio=new BigDecimal(i%3==0?"14.50":"16.90");
            String zona=zonas[(i-1)%6], proveedor=i>98?(ruc.equals("20999999999")?"20888888888":"20999999999"):ruc;
            String precioCol=table.equals("vales")?"precio_contrato":"precio";
            String unidadCol=table.equals("vales")?"codigo_unidad_movil":"codigo_unidad";
            String authCol=table.equals("vales")?"fecha_autorizacion":"fecha_operacion_autorizacion";
            jdbc.update("INSERT INTO "+table+" (codigo_vale,cod_zonal,cod_localidad,cod_proveedor,cod_trabajador,fecha_emision,id_suministro,cantidad_emitida,"
                +precioCol+",cod_centrocosto,"+unidadCol+",estado_vale,observacion,"+authCol+") VALUES (?,?,?,?,?,?,?,?,?,'90211101',?,?,?,?)",
                codigo,zona,zona,proveedor,String.format(Locale.ROOT,"700000%02d",1+(i-1)%10),now.minusDays(1+i%12),
                i%3==0?"DIESEL-B5":"GASOHOL-REG",cantidad,precio,i,estado,"SIMULACIÓN del servicio A. Sin validez operativa.",estado==0?null:now.minusDays(1));
            if(estado==2 || estado==3) jdbc.update("UPDATE "+table+" SET cantidad_consumida=?,precio_real=?,importe=?,ticket=?,usuario='operador',fecha_consumo=? WHERE codigo_vale=?",
                cantidad,precio,cantidad.multiply(precio),"DEMO-"+i,now.minusHours(i%20),codigo);
            if(estado==4) jdbc.update("UPDATE "+table+" SET fecha_anulacion=?,observacion_anulacion='ANULACIÓN SIMULADA' WHERE codigo_vale=?",now.minusHours(2),codigo);
        }
    }
}
