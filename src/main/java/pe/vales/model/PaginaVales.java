package pe.vales.model;
import java.util.List;
public record PaginaVales(List<Vale> items, long total, int pagina, int tamanio) {}
