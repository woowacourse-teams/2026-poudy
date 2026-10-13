package com.poudy.security.filter;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ForbiddenRequestException;
import com.poudy.security.ClientOrigins;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.util.WebUtils;

public class ForeignOriginFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final ClientOrigins clientOrigins;
    private final HandlerExceptionResolver handlerExceptionResolver;

    public ForeignOriginFilter(ClientOrigins clientOrigins, HandlerExceptionResolver handlerExceptionResolver) {
        this.clientOrigins = clientOrigins;
        this.handlerExceptionResolver = handlerExceptionResolver;
    }

    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain chain
    )
        throws ServletException,
        IOException {
        if (isForeignStateChange(request)) {
            handlerExceptionResolver.resolveException(
                request,
                response,
                null,
                new ForbiddenRequestException(ErrorCode.FORBIDDEN_ORIGIN)
            );
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean isForeignStateChange(HttpServletRequest request) {
        return !SAFE_METHODS.contains(request.getMethod())
            && !WebUtils.isSameOrigin(new ServletServerHttpRequest(request))
            && !clientOrigins.isAllowedOrigin(request.getHeader(HttpHeaders.ORIGIN));
    }
}
