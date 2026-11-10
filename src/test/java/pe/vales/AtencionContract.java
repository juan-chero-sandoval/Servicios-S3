package pe.vales;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pe.vales.api.AtencionRequest;
import pe.vales.domain.ReglaException;
import pe.vales.service.AtencionService;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("demo")
abstract class AtencionContract {
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired Environment env;
    @Autowired AtencionService service;
    String table;
    final String ruc="20100032458";
    @BeforeEach void fixtures() {
        table=env.getProperty("app.vale-table");
        jdbc.update("DELETE FROM "+table);
        for(int i=1;i<=6;i++) {
            jdbc.update("INSERT INTO "+table+" (codigo_vale,cod_zonal,cod_localidad,cod_proveedor,cod_trabajador,fecha_emision,cantidad_emitida,estado_vale,observacion) "
                +"VALUES (?,'01','01',?,'70000001',CURRENT_TIMESTAMP,20,?,'NO MODIFICAR A')",
                "202611000"+i,i==6?"20999999999":ruc,i==3?0:(i==4?4:1));
        }
    }
    String body(String code,String cantidad,String precio) {
        return "{\"vales\":[{\"codigoVale\":\""+code+"\",\"cantidadConsumida\":"+cantidad+",\"precioReal\":"+precio+",\"ticket\":\"T001-42\"}]}";
    }
    @Test void registraConsumoYNoModificaEmision() throws Exception {
        mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body("2026110001","10.25","16.90")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$[0].estadoVale").value(2))
            .andExpect(jsonPath("$[0].importe").value(173.23)).andExpect(jsonPath("$[0].usuario").value("operador"));
        assertThat(jdbc.queryForObject("SELECT observacion FROM "+table+" WHERE codigo_vale='2026110001'",String.class)).isEqualTo("NO MODIFICAR A");
        assertThat(jdbc.queryForObject("SELECT cantidad_emitida FROM "+table+" WHERE codigo_vale='2026110001'",BigDecimal.class)).isEqualByComparingTo("20");
        assertThat(jdbc.queryForObject("SELECT fecha_consumo FROM "+table+" WHERE codigo_vale='2026110001'",java.sql.Timestamp.class)).isNotNull();
    }
    @Test void rechazaSegundoConsumo() throws Exception {
        var request=post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body("2026110001","10","16.9"));
        mvc.perform(request).andExpect(status().isCreated());mvc.perform(request).andExpect(status().isConflict());
    }
    @Test void rechazaNoAutorizadosAnuladosExcesoYProveedorAjeno() throws Exception {
        for(String c:List.of("2026110003","2026110004"))mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body(c,"10","16.9"))).andExpect(status().isConflict());
        mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body("2026110001","20.01","16.9"))).andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body("2026110006","10","16.9"))).andExpect(status().isNotFound());
        jdbc.update("UPDATE "+table+" SET cantidad_consumida=1 WHERE codigo_vale='2026110005'");
        mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body("2026110005","10","16.9"))).andExpect(status().isConflict());
        if (table.equals("logis_vales")) {
            jdbc.update("UPDATE logis_vales SET estado=FALSE WHERE codigo_vale='2026110002'");
            mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body("2026110002","10","16.9"))).andExpect(status().isConflict());
        }
    }
    @Test void loteSeRevierteSiOtroValeFalla() throws Exception {
        String batch="{\"vales\":[{\"codigoVale\":\"2026110001\",\"cantidadConsumida\":10,\"precioReal\":17,\"ticket\":\"A1\"},{\"codigoVale\":\"2026110003\",\"cantidadConsumida\":10,\"precioReal\":17,\"ticket\":\"A2\"}]}";
        mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(batch)).andExpect(status().isConflict());
        assertThat(jdbc.queryForObject("SELECT estado_vale FROM "+table+" WHERE codigo_vale='2026110001'",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT importe FROM "+table+" WHERE codigo_vale='2026110001'",BigDecimal.class)).isNull();
    }
    @Test void rechazaDuplicadosYLotesVacios() throws Exception {
        String item="{\"codigoVale\":\"2026110001\",\"cantidadConsumida\":10,\"precioReal\":17,\"ticket\":\"A1\"}";
        mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"vales\":["+item+","+item+"]}")).andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"vales\":[]}")).andExpect(status().isBadRequest());
    }
    @Test void validaDecimalesYNoAceptaImporteOUsuarioDelCliente() throws Exception {
        mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body("2026110001","1.001","17"))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body("2026110001","1","17").replace("\"ticket\":","\"usuario\":\"intruso\",\"ticket\":"))).andExpect(status().isBadRequest());
    }
    @Test void requiereSesionYCsrf() throws Exception {
        mvc.perform(get("/api/vales")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/vales").with(user("visitante").roles("LECTOR"))).andExpect(status().isForbidden());
        mvc.perform(post("/api/atenciones").with(user("operador").roles("GRIFO")).contentType(MediaType.APPLICATION_JSON).content(body("2026110001","10","17"))).andExpect(status().isForbidden());
    }
    @Test void listaFiltradaAisladaYPaginada() throws Exception {
        mvc.perform(get("/api/vales?estado=1&tamanio=2").with(user("operador").roles("GRIFO")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(3)).andExpect(jsonPath("$.items.length()").value(2));
        mvc.perform(get("/api/vales?q=2026110006").with(user("operador").roles("GRIFO"))).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/vales?tamanio=101").with(user("operador").roles("GRIFO"))).andExpect(status().isBadRequest());
    }
    @Test void dosOperadoresNoPuedenConsumirElMismoVale() throws Exception {
        var pool=Executors.newFixedThreadPool(2);
        var ready=new CountDownLatch(2);var start=new CountDownLatch(1);
        var success=new AtomicInteger();var conflict=new AtomicInteger();
        var request=new AtencionRequest(List.of(new AtencionRequest.Item("2026110001",new BigDecimal("10"),new BigDecimal("17"),"CONC-1")));
        Callable<Void> operation=()->{ready.countDown();if(!start.await(5,TimeUnit.SECONDS))throw new AssertionError("Timeout inicial");
            try {service.registrar(request,ruc,"operador");success.incrementAndGet();}
            catch(ReglaException e){assertThat(e.status()).isEqualTo(409);conflict.incrementAndGet();}return null;};
        try {var a=pool.submit(operation);var b=pool.submit(operation);assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();start.countDown();a.get(10,TimeUnit.SECONDS);b.get(10,TimeUnit.SECONDS);}
        finally {start.countDown();pool.shutdownNow();}
        assertThat(success.get()).isEqualTo(1);assertThat(conflict.get()).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT importe FROM "+table+" WHERE codigo_vale='2026110001'",BigDecimal.class)).isEqualByComparingTo("170");
    }
}
