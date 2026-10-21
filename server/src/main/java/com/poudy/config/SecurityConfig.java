package com.poudy.config;

import com.poudy.security.AccessRule;
import com.poudy.security.ClientOrigins;
import com.poudy.security.auth.oauth.OAuthLoginConfigurer;
import com.poudy.security.domain.UserActivity;
import com.poudy.security.filter.ActiveUserFilter;
import com.poudy.security.filter.ForeignOriginFilter;
import com.poudy.security.session.LoginSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.header.HeaderWriterFilter;
import org.springframework.security.web.header.writers.DelegatingRequestMatcherHeaderWriter;
import org.springframework.security.web.header.writers.StaticHeadersWriter;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.servlet.HandlerExceptionResolver;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        ClientOrigins clientOrigins,
        SecurityContextRepository securityContextRepository,
        OAuthLoginConfigurer oauthLoginConfigurer,
        LoginSession loginSession,
        UserActivity userActivity,
        @Qualifier("handlerExceptionResolver") HandlerExceptionResolver handlerExceptionResolver
    ) {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(clientOrigins.corsConfigurationSource()))
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .logout(
                logout -> logout
                    .logoutRequestMatcher(
                        new OrRequestMatcher(Arrays.stream(AccessRule.values()).map(AccessRule::logoutRequest).toList())
                    )
                    .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
            )
            .requestCache(AbstractHttpConfigurer::disable)
            .headers(
                headers -> headers
                    .cacheControl(HeadersConfigurer.CacheControlConfig::disable)
                    .addHeaderWriter(
                        new DelegatingRequestMatcherHeaderWriter(
                            privateResponses(),
                            new StaticHeadersWriter(HttpHeaders.CACHE_CONTROL, CacheControl.noStore().getHeaderValue())
                        )
                    )
            )
            .securityContext(context -> context.securityContextRepository(securityContextRepository))
            .authorizeHttpRequests(requests -> {
                Arrays.stream(AccessRule.values()).forEach(rule -> rule.authorize(requests));
                requests.anyRequest().permitAll();
            })
            .oauth2Login(oauthLoginConfigurer::configure)
            .exceptionHandling(
                exceptions -> exceptions
                    .authenticationEntryPoint(
                        (request, response, exception) -> {
                            if (swaggerPage().matches(request)) {
                                response.sendRedirect("/admin/login?next=%2Fapi%2Fadmin%2Fswagger-ui.html");
                                return;
                            }
                            handlerExceptionResolver.resolveException(request, response, null, exception);
                        }
                    )
                    .accessDeniedHandler(
                        (request, response, exception) -> handlerExceptionResolver.resolveException(
                            request,
                            response,
                            null,
                            exception
                        )
                    )
            )
            .addFilterAfter(
                new ActiveUserFilter(userActivity, loginSession, handlerExceptionResolver),
                HeaderWriterFilter.class
            )
            .addFilterBefore(
                new ForeignOriginFilter(clientOrigins, handlerExceptionResolver),
                SecurityContextHolderFilter.class
            )
            .addFilterBefore(
                (request, response, chain) -> {
                    loginSession.refresh((HttpServletRequest) request, (HttpServletResponse) response);
                    chain.doFilter(request, response);
                },
                SecurityContextHolderFilter.class
            );
        return http.build();
    }

    @Bean
    public ClientOrigins clientOrigins(@Value("${poudy.cors.allowed-origins:}") List<String> configuredOrigins) {
        return ClientOrigins.from(configuredOrigins);
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    private static RequestMatcher swaggerPage() {
        return new OrRequestMatcher(
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/admin/swagger-ui.html"),
            PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.GET, "/api/admin/swagger-ui/index.html")
        );
    }

    private static RequestMatcher privateResponses() {
        return new OrRequestMatcher(
            AccessRule.USER.requestMatcher(),
            AccessRule.ADMIN.requestMatcher(),
            PathPatternRequestMatcher.withDefaults().matcher("/api/auth/**")
        );
    }
}
