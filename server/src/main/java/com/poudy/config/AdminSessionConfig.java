package com.poudy.config;

import com.poudy.security.session.AdminSessionRepository;
import jakarta.servlet.Filter;
import jakarta.servlet.ServletException;
import java.io.IOException;
import org.apache.catalina.connector.Request;
import org.apache.catalina.connector.Response;
import org.apache.catalina.valves.ValveBase;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieHttpSessionIdResolver;
import org.springframework.session.web.http.DefaultCookieSerializer;
import org.springframework.session.web.http.SessionRepositoryFilter;

@Configuration
public class AdminSessionConfig {

    public static final String ADMIN_PATH = "/api/admin";

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> isolateAdminFromTomcatSession() {
        return factory -> factory.addContextValves(new ValveBase(true) {
            @Override
            public void invoke(Request request, Response response) throws IOException, ServletException {
                String path = request.getRequestPathMB().toString();
                if (path.equals(ADMIN_PATH) || path.startsWith(ADMIN_PATH + "/")) {
                    request.setRequestedSessionId(null);
                }
                getNext().invoke(request, response);
            }
        });
    }

    @Bean
    public FilterRegistrationBean<Filter> adminSessionFilter(AdminSessionRepository adminSessionRepository) {
        DefaultCookieSerializer cookie = new DefaultCookieSerializer();
        cookie.setCookieName("POUDY_ADMIN_SESSION");
        cookie.setCookiePath(ADMIN_PATH);
        cookie.setUseBase64Encoding(false);
        cookie.setUseHttpOnlyCookie(true);
        cookie.setUseSecureCookie(true);
        cookie.setSameSite("Lax");
        CookieHttpSessionIdResolver resolver = new CookieHttpSessionIdResolver();
        resolver.setCookieSerializer(cookie);

        SessionRepositoryFilter<?> filter = new SessionRepositoryFilter<>(adminSessionRepository);
        filter.setHttpSessionIdResolver(resolver);
        FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>(filter);
        registration.setName("adminSessionFilter");
        registration.addUrlPatterns(ADMIN_PATH + "/*");
        registration.setOrder(SessionRepositoryFilter.DEFAULT_ORDER);
        return registration;
    }
}
