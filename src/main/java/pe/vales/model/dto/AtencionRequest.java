package pe.vales.model.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
public record AtencionRequest(@NotEmpty @Size(max=20) List<@NotNull @Valid Item> vales) {
    public record Item(
        @NotBlank @Pattern(regexp="[0-9]{1,10}") String codigoVale,
        @NotNull @DecimalMin("0.01") @Digits(integer=12, fraction=2) BigDecimal cantidadConsumida,
        @NotNull @DecimalMin("0.01") @Digits(integer=12, fraction=2) BigDecimal precioReal,
        @NotBlank @Size(max=15) @Pattern(regexp="[A-Za-z0-9][A-Za-z0-9 /_-]*") String ticket
    ) {}
}
