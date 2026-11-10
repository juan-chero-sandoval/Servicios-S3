package pe.vales.model;
import java.math.BigDecimal;
import java.time.LocalDateTime;
public record Vale(String codigoVale, String zonal, String codZonal, String localidad,
        String codProveedor, String proveedor, String nrocontrato, String trabajador,
        String placa, String tipoVehiculo, String idSuministro, BigDecimal cantidadEmitida,
        BigDecimal precioReferencial, int estadoVale, String estado, boolean activo,
        LocalDateTime fechaEmision, LocalDateTime fechaConsumo, BigDecimal cantidadConsumida,
        BigDecimal precioReal, BigDecimal importe, String ticket, String usuario) {}
