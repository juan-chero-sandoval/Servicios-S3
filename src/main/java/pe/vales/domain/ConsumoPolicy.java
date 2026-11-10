package pe.vales.domain;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
public final class ConsumoPolicy {
    private ConsumoPolicy() {}
    public record Estado(String codigo, String proveedor, int estado, boolean activo,
                         BigDecimal emitida, LocalDateTime fechaConsumo, boolean tieneConsumo) {}
    public static BigDecimal validar(Estado vale, String proveedor, BigDecimal cantidad, BigDecimal precio) {
        if (!vale.proveedor().equals(proveedor)) throw new ReglaException(404, "Vale no encontrado.");
        if (!vale.activo() || vale.estado() != 1 || vale.fechaConsumo() != null || vale.tieneConsumo())
            throw new ReglaException(409, "El vale " + vale.codigo() + " no está disponible: debe estar AUTORIZADO y sin consumo previo.");
        if (vale.emitida() == null || vale.emitida().signum() <= 0)
            throw new ReglaException(409, "El vale no tiene una cantidad emitida válida. Revisar con el servicio A.");
        positivo(cantidad, "Cantidad"); positivo(precio, "Precio real");
        if (cantidad.compareTo(vale.emitida()) > 0)
            throw new ReglaException(422, "La cantidad supera los galones emitidos del vale " + vale.codigo() + ".");
        BigDecimal importe = cantidad.multiply(precio).setScale(2, RoundingMode.HALF_UP);
        if (importe.compareTo(new BigDecimal("999999999999.99")) > 0 || importe.signum() <= 0)
            throw new ReglaException(422, "El importe calculado debe estar entre 0.01 y 999999999999.99.");
        return importe;
    }
    private static void positivo(BigDecimal value, String campo) {
        if (value == null || value.signum() <= 0 || value.compareTo(new BigDecimal("999999999999.99")) > 0
                || value.stripTrailingZeros().scale() > 2)
            throw new ReglaException(422, campo + ": use un valor positivo con hasta dos decimales.");
    }
}
