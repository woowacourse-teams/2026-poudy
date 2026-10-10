package com.poudy.security;

import com.poudy.security.session.Role;
import java.util.Arrays;
import java.util.List;
import org.springframework.http.HttpMethod;
import org.springframework.http.server.PathContainer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

public enum AccessRule {
    MEMBER("/api/members/**", Role.MEMBER, "/api/members/logout"),
    ADMIN("/api/admin/**", Role.ADMIN, "/api/admin/logout", "/api/admin/login");

    private final String pathPattern;
    private final Role role;
    private final String logoutPath;
    private final List<String> publicPaths;

    AccessRule(String pathPattern, Role role, String logoutPath, String... publicPaths) {
        this.pathPattern = pathPattern;
        this.role = role;
        this.logoutPath = logoutPath;
        this.publicPaths = List.of(publicPaths);
    }

    public static boolean requiresLogin(String path) {
        return Arrays.stream(values()).anyMatch(rule -> rule.protects(path));
    }

    public void authorize(
        AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry requests
    ) {
        publicPaths.forEach(publicPath -> requests.requestMatchers(publicPath).permitAll());
        requests.requestMatchers(pathPattern).hasAuthority(role.authority());
    }

    public String logoutPath() {
        return logoutPath;
    }

    public RequestMatcher requestMatcher() {
        return PathPatternRequestMatcher.withDefaults().matcher(pathPattern);
    }

    public RequestMatcher logoutRequest() {
        RequestMatcher logoutPost = PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, logoutPath);
        return request -> logoutPost.matches(request)
            && role.isGrantedTo(SecurityContextHolder.getContext().getAuthentication());
    }

    private boolean protects(String path) {
        PathPattern pattern = PathPatternParser.defaultInstance.parse(pathPattern);
        return pattern.matches(PathContainer.parsePath(path)) && !publicPaths.contains(path);
    }
}
