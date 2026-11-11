package pe.vales.controller;
import java.security.Principal;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import pe.vales.persistence.ValeRepository;
import pe.vales.service.AtencionService;
import pe.vales.model.*;
import pe.vales.model.dto.AtencionRequest;
@RestController @RequestMapping("/api") @Validated
public class ValeController {
    private final ValeRepository repo;
    private final AtencionService service;
    private final String ruc;
    private final boolean demo;
    public ValeController(ValeRepository repo, AtencionService service,
        @Value("${app.operador.ruc}") String ruc, @Value("${app.demo:false}") boolean demo) {
        this.repo=repo; this.service=service; this.ruc=ruc; this.demo=demo;
    }
    @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token) {
        return Map.of("headerName",token.getHeaderName(),"parameterName",token.getParameterName(),"token",token.getToken());
    }
    @GetMapping("/sesion") public Map<String,Object> sesion(Principal principal) {
        return Map.of("usuario",principal.getName(),"ruc",ruc,"demo",demo);
    }
    @GetMapping("/vales") public PaginaVales listar(
        @RequestParam(required=false) @Min(0) @Max(4) Integer estado,
        @RequestParam(defaultValue="") @Size(max=100) String q,
        @RequestParam(defaultValue="") @Pattern(regexp="[0-9]{2}|^$") String zonal,
        @RequestParam(defaultValue="0") @Min(0) @Max(1000000) int pagina,
        @RequestParam(defaultValue="15") @Min(1) @Max(100) int tamanio) {
        return repo.listar(ruc,estado,q,zonal,pagina,tamanio);
    }
    @GetMapping("/vales/{codigo}") public Vale obtener(@PathVariable @Pattern(regexp="[0-9]{1,10}") String codigo) {
        return repo.obtener(codigo,ruc);
    }
    @GetMapping("/zonales") public List<Map<String,Object>> zonales() { return repo.zonales(ruc); }
    @GetMapping("/resumen") public Map<String,Object> resumen() { return repo.resumen(ruc); }
    @PostMapping("/atenciones") @ResponseStatus(HttpStatus.CREATED)
    public List<Vale> atender(@RequestBody @Valid AtencionRequest request, Principal principal) {
        return service.registrar(request,ruc,principal.getName());
    }
}
