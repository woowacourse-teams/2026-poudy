package com.poudy.security.filter;

import com.poudy.security.AccessRule;
import com.poudy.security.domain.UserActivity;
import com.poudy.security.session.LoginMember;
import com.poudy.security.session.LoginSession;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerExceptionResolver;

public class ActiveUserFilter extends OncePerRequestFilter {

    private final RequestMatcher userRequests = AccessRule.USER.requestMatcher();
    private final UserActivity userActivity;
    private final LoginSession loginSession;
    private final HandlerExceptionResolver handlerExceptionResolver;

    public ActiveUserFilter(
        UserActivity userActivity,
        LoginSession loginSession,
        HandlerExceptionResolver handlerExceptionResolver
    ) {
        this.userActivity = userActivity;
        this.loginSession = loginSession;
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
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (userRequests.matches(request)
            && authentication != null
            && authentication.getPrincipal() instanceof LoginMember user
            && !userActivity.isActive(user.id())) {
            loginSession.signOut(request, response);
            handlerExceptionResolver.resolveException(
                request,
                response,
                null,
                new CredentialsExpiredException("활성 회원이 아닙니다.")
            );
            return;
        }
        chain.doFilter(request, response);
    }
}
