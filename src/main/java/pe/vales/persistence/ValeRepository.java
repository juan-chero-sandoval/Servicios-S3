package pe.vales.persistence;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;
import pe.vales.domain.*;
import pe.vales.model.*;
@Repository
public class ValeRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private final String table, precio, unidad, activo;
    public ValeRepository(NamedParameterJdbcTemplate jdbc, @Value("${app.vale-table}") String table) {
        if (!Set.of("vales", "logis_vales").contains(table))
            throw new IllegalArgumentException("VALE_TABLE debe ser vales o logis_vales");
        this.jdbc=jdbc; this.table=table;
        this.precio=table.equals("vales") ? "precio_contrato" : "precio";
        this.unidad=table.equals("vales") ? "codigo_unidad_movil" : "codigo_unidad";
        this.activo=table.equals("vales") ? "TRUE" : "COALESCE(v.estado, FALSE)";
    }
    private String select() {
        return "SELECT v.*, v."+precio+" AS precio_ref, "+activo+" AS activo_b, "
            +"z.nom_zona, l.nom_localidad, p.razon_social, "
            +"trim(concat(pe.nombre, ' ', pe.ap_paterno, ' ', pe.ap_materno)) AS nombre_trabajador, "
            +"u.placa, u.tipo_vehiculo, e.descripcion AS estado_nombre FROM "+table+" v "
            +"LEFT JOIN zonal z ON z.id_zona=v.cod_zonal "
            +"LEFT JOIN localidad l ON l.id_localidad=v.cod_localidad "
            +"LEFT JOIN proveedor p ON p.cod_proveedor=v.cod_proveedor "
            +"LEFT JOIN trabajador t ON t.dni=v.cod_trabajador "
            +"LEFT JOIN persona pe ON pe.codigo_persona=t.codigo_persona "
            +"LEFT JOIN unidad_maquinaria u ON u.codigo=v."+unidad+" "
            +"LEFT JOIN estado_vale e ON e.codigo=v.estado_vale ";
    }
    private Vale map(ResultSet r, int n) throws SQLException {
        return new Vale(r.getString("codigo_vale"),r.getString("nom_zona"),r.getString("cod_zonal"),
            r.getString("nom_localidad"),r.getString("cod_proveedor"),r.getString("razon_social"),
            r.getString("nrocontrato"),r.getString("nombre_trabajador"),r.getString("placa"),
            r.getString("tipo_vehiculo"),r.getString("id_suministro"),r.getBigDecimal("cantidad_emitida"),
            r.getBigDecimal("precio_ref"),r.getInt("estado_vale"),r.getString("estado_nombre"),
            r.getBoolean("activo_b"),date(r,"fecha_emision"),date(r,"fecha_consumo"),
            r.getBigDecimal("cantidad_consumida"),r.getBigDecimal("precio_real"),r.getBigDecimal("importe"),
            r.getString("ticket"),r.getString("usuario"));
    }
    private static LocalDateTime date(ResultSet r, String key) throws SQLException {
        var t=r.getTimestamp(key); return t==null ? null : t.toLocalDateTime();
    }
    public PaginaVales listar(String ruc, Integer estado, String busqueda, String zonal, int pagina, int tamanio) {
        var args=new MapSqlParameterSource("ruc", ruc);
        String where=" WHERE v.cod_proveedor=:ruc";
        if (estado!=null) { where+=" AND v.estado_vale=:estado"; args.addValue("estado",estado); }
        if (zonal!=null && !zonal.isBlank()) { where+=" AND v.cod_zonal=:zonal"; args.addValue("zonal",zonal); }
        if (busqueda!=null && !busqueda.isBlank()) {
            where+=" AND (lower(v.codigo_vale) LIKE :q ESCAPE '!' OR lower(u.placa) LIKE :q ESCAPE '!' OR lower(pe.nombre) LIKE :q ESCAPE '!')";
            args.addValue("q","%"+busqueda.trim().toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%");
        }
        String from=select().substring(select().indexOf(" FROM "));
        long total=jdbc.queryForObject("SELECT count(*)"+from+where,args,Long.class);
        args.addValue("limit",tamanio).addValue("offset",(long)pagina*tamanio);
        return new PaginaVales(jdbc.query(select()+where+" ORDER BY v.codigo_vale DESC LIMIT :limit OFFSET :offset",args,this::map),total,pagina,tamanio);
    }
    public Vale obtener(String codigo, String ruc) {
        var rows=jdbc.query(select()+" WHERE v.codigo_vale=:codigo AND v.cod_proveedor=:ruc",Map.of("codigo",codigo,"ruc",ruc),this::map);
        if(rows.isEmpty()) throw new ReglaException(404,"Vale no encontrado.");
        return rows.getFirst();
    }
    public ConsumoPolicy.Estado bloquear(String codigo, String ruc) {
        var rows=jdbc.query("SELECT v.*, "+activo+" AS activo_b FROM "+table+" v WHERE v.codigo_vale=:codigo AND v.cod_proveedor=:ruc FOR UPDATE",
            Map.of("codigo",codigo,"ruc",ruc), (r,n)->new ConsumoPolicy.Estado(r.getString("codigo_vale"),r.getString("cod_proveedor"),
                r.getInt("estado_vale"),r.getBoolean("activo_b"),r.getBigDecimal("cantidad_emitida"),date(r,"fecha_consumo"),
                r.getBigDecimal("cantidad_consumida")!=null || r.getBigDecimal("precio_real")!=null || r.getBigDecimal("importe")!=null || r.getString("ticket")!=null));
        if(rows.isEmpty()) throw new ReglaException(404,"Vale no encontrado: "+codigo);
        return rows.getFirst();
    }
    public void consumir(String codigo, String ruc, BigDecimal cantidad, BigDecimal precioReal,
                         BigDecimal importe, String ticket, String usuario, LocalDateTime fecha) {
        int n=jdbc.update("UPDATE "+table+" SET cantidad_consumida=:cantidad, precio_real=:precio, importe=:importe, "
            +"ticket=:ticket, usuario=:usuario, fecha_consumo=:fecha, estado_vale=2 "
            +"WHERE codigo_vale=:codigo AND cod_proveedor=:ruc AND estado_vale=1 AND fecha_consumo IS NULL",
            new MapSqlParameterSource("codigo",codigo).addValue("ruc",ruc).addValue("cantidad",cantidad).addValue("precio",precioReal)
            .addValue("importe",importe).addValue("ticket",ticket).addValue("usuario",usuario).addValue("fecha",fecha));
        if(n!=1) throw new ReglaException(409,"El vale cambió de estado. Actualice la lista.");
    }
    public List<Map<String,Object>> zonales(String ruc) {
        return jdbc.queryForList("SELECT DISTINCT z.id_zona AS codigo, z.nom_zona AS nombre FROM zonal z JOIN "+table+" v ON v.cod_zonal=z.id_zona WHERE v.cod_proveedor=:ruc ORDER BY z.id_zona", Map.of("ruc",ruc));
    }
    public Map<String,Object> resumen(String ruc) {
        return jdbc.queryForMap("SELECT count(*) AS total, "
            +"coalesce(sum(CASE WHEN estado_vale=1 THEN 1 ELSE 0 END),0) AS autorizados, "
            +"coalesce(sum(CASE WHEN estado_vale=2 THEN 1 ELSE 0 END),0) AS consumidos, "
            +"coalesce(sum(CASE WHEN estado_vale=2 THEN importe ELSE 0 END),0) AS importe "
            +"FROM "+table+" WHERE cod_proveedor=:ruc", Map.of("ruc",ruc));
    }
}
