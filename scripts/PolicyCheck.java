import java.math.BigDecimal;
import java.time.LocalDateTime;
import pe.vales.domain.*;
public class PolicyCheck {
    private static int passed;
    private static BigDecimal b(String s) { return new BigDecimal(s); }
    private static ConsumoPolicy.Estado estado(int e, boolean activo, String emitida, boolean previo) {
        return new ConsumoPolicy.Estado("2026110001","20100032458",e,activo,emitida==null?null:b(emitida),null,previo);
    }
    private static void equals(String expected, BigDecimal actual) {
        if(!b(expected).equals(actual)) throw new AssertionError(expected+" != "+actual); passed++;
    }
    private static void rejects(int expected, Runnable action) {
        try { action.run(); } catch(ReglaException e) {
            if(e.status()!=expected) throw new AssertionError("status: "+e.status());passed++;return;
        }
        throw new AssertionError("Se esperaba rechazo "+expected);
    }
    public static void main(String[] args) {
        var autorizado=estado(1,true,"20.00",false);
        equals("338.00",ConsumoPolicy.validar(autorizado,"20100032458",b("20"),b("16.90")));
        equals("169.00",ConsumoPolicy.validar(autorizado,"20100032458",b("10"),b("16.90")));
        equals("2.11",ConsumoPolicy.validar(autorizado,"20100032458",b("1.25"),b("1.69")));
        equals("0.02",ConsumoPolicy.validar(autorizado,"20100032458",b("0.01"),b("1.50")));
        equals("16.90",ConsumoPolicy.validar(autorizado,"20100032458",b("1.000"),b("16.900")));
        for(int e:new int[]{0,2,3,4}) rejects(409,()->ConsumoPolicy.validar(estado(e,true,"20",false),"20100032458",b("1"),b("1")));
        rejects(409,()->ConsumoPolicy.validar(estado(1,false,"20",false),"20100032458",b("1"),b("1")));
        rejects(409,()->ConsumoPolicy.validar(estado(1,true,"20",true),"20100032458",b("1"),b("1")));
        rejects(409,()->ConsumoPolicy.validar(new ConsumoPolicy.Estado("1","20100032458",1,true,b("20"),LocalDateTime.now(),false),"20100032458",b("1"),b("1")));
        rejects(404,()->ConsumoPolicy.validar(autorizado,"20999999999",b("1"),b("1")));
        rejects(409,()->ConsumoPolicy.validar(estado(1,true,null,false),"20100032458",b("1"),b("1")));
        rejects(409,()->ConsumoPolicy.validar(estado(1,true,"0",false),"20100032458",b("1"),b("1")));
        rejects(422,()->ConsumoPolicy.validar(autorizado,"20100032458",b("20.01"),b("1")));
        for(String value:new String[]{"0","-1","0.001","1000000000000"}) {
            rejects(422,()->ConsumoPolicy.validar(autorizado,"20100032458",b(value),b("1")));
            rejects(422,()->ConsumoPolicy.validar(autorizado,"20100032458",b("1"),b(value)));
        }
        rejects(422,()->ConsumoPolicy.validar(autorizado,"20100032458",null,b("1")));
        rejects(422,()->ConsumoPolicy.validar(autorizado,"20100032458",b("1"),null));
        rejects(422,()->ConsumoPolicy.validar(autorizado,"20100032458",b("20"),b("999999999999.99")));
        rejects(422,()->ConsumoPolicy.validar(autorizado,"20100032458",b("0.01"),b("0.01")));
        System.out.println(passed+" verificaciones de negocio correctas.");
    }
}
