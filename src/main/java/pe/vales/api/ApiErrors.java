package pe.vales.api;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.*;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.*;
import jakarta.validation.ConstraintViolationException;
import pe.vales.domain.ReglaException;
@RestControllerAdvice
public class ApiErrors {
    private static final Logger log=LoggerFactory.getLogger(ApiErrors.class);
    private ResponseEntity<?> error(int status, String mensaje) { return ResponseEntity.status(status).body(Map.of("status",status,"mensaje",mensaje)); }
    @ExceptionHandler(ReglaException.class) ResponseEntity<?> regla(ReglaException e) { return error(e.status(),e.getMessage()); }
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> campos(MethodArgumentNotValidException e) {
        return error(400,e.getBindingResult().getFieldErrors().stream().map(f->f.getField()+": "+f.getDefaultMessage()).reduce((a,b)->a+"; "+b).orElse("Datos inválidos."));
    }
    @ExceptionHandler({ConstraintViolationException.class, HandlerMethodValidationException.class,
        MethodArgumentTypeMismatchException.class, HttpMessageNotReadableException.class})
    ResponseEntity<?> invalido(Exception e) { return error(400,"Revise los datos, formatos y parámetros enviados."); }
    @ExceptionHandler(ConcurrencyFailureException.class) ResponseEntity<?> concurrencia(Exception e) { return error(409,"Otro operador está atendiendo el vale. Actualice e intente de nuevo."); }
    @ExceptionHandler(DataAccessException.class) ResponseEntity<?> bd(Exception e) {
        log.error("Error de acceso a datos al atender vales",e);
        return error(503,"No se pudo completar la operación. Revise el estado de los vales antes de reintentar.");
    }
}
