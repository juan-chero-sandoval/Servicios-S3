package pe.vales;
import org.springframework.test.context.TestPropertySource;
@TestPropertySource(properties={"app.vale-table=vales","spring.datasource.url=jdbc:h2:mem:vales-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000"})
class AtencionValesTest extends AtencionContract {}
