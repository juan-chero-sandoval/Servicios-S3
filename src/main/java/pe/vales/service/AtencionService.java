package pe.vales.service;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.vales.api.AtencionRequest;
import pe.vales.domain.*;
import pe.vales.persistence.ValeRepository;
@Service
public class AtencionService {
    private final ValeRepository repo;
    private final Clock clock;
    public AtencionService(ValeRepository repo, Clock clock) { this.repo=repo; this.clock=clock; }
    @Transactional(timeout=15)
    public List<ValeRepository.Vale> registrar(AtencionRequest request, String ruc, String usuario) {
        var codigos=new HashSet<String>();
        for(var item:request.vales())
            if(!codigos.add(item.codigoVale())) throw new ReglaException(422,"El lote contiene un vale repetido.");
        var ordenados=request.vales().stream().sorted(Comparator.comparing(AtencionRequest.Item::codigoVale)).toList();
        var fecha=LocalDateTime.now(clock).withNano(0);
        // Orden estable de bloqueos; si un elemento falla, Spring revierte todo el lote.
        for(var item:ordenados) {
            var vale=repo.bloquear(item.codigoVale(),ruc);
            var importe=ConsumoPolicy.validar(vale,ruc,item.cantidadConsumida(),item.precioReal());
            repo.consumir(item.codigoVale(),ruc,item.cantidadConsumida(),item.precioReal(),importe,
                item.ticket().trim().toUpperCase(Locale.ROOT),usuario,fecha);
        }
        return ordenados.stream().map(i->repo.obtener(i.codigoVale(),ruc)).toList();
    }
}
