package pe.vales.config;
import java.time.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
@Configuration
public class SecurityConfig {
    @Bean Clock clock() { return Clock.system(ZoneId.of("America/Lima")); }
    @Bean PasswordEncoder encoder() { return new BCryptPasswordEncoder(); }
    @Bean UserDetailsService users(PasswordEncoder encoder, @Value("${app.operador.usuario}") String usuario,
        @Value("${app.operador.password}") String password, @Value("${app.operador.ruc}") String ruc) {
        if(!usuario.matches("[A-Za-z0-9]{1,8}") || !ruc.matches("[0-9]{11}") || password.length()<8)
            throw new IllegalArgumentException("Revise usuario (1-8 alfanuméricos), RUC (11 dígitos) y contraseña (mínimo 8).");
        return new InMemoryUserDetailsManager(User.withUsername(usuario).password(encoder.encode(password)).roles("GRIFO").build());
    }
    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(a->a.requestMatchers("/login.html","/js/**","/style.css","/api/csrf","/favicon.svg","/error").permitAll()
            .anyRequest().hasRole("GRIFO"))
            .formLogin(f->f.loginPage("/login.html").loginProcessingUrl("/login")
                .successHandler((req,res,auth)->res.setStatus(204))
                .failureHandler((req,res,ex)->res.sendError(401,"Credenciales incorrectas")))
            .logout(l->l.logoutUrl("/logout").logoutSuccessHandler((req,res,auth)->res.setStatus(204)))
            .exceptionHandling(e->e.defaultAuthenticationEntryPointFor((req,res,ex)->res.sendError(401),new AntPathRequestMatcher("/api/**")))
            .headers(h->h.contentSecurityPolicy(c->c.policyDirectives("default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'")));
        return http.build();
    }
}
