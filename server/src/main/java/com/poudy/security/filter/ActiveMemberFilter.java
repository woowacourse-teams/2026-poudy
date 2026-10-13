package com.poudy.security.filter;

import com.poudy.security.AccessRule;
import com.poudy.security.domain.MemberActivity;
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

public class ActiveMemberFilter extends OncePerRequestFilter {

    private final RequestMatcher memberRequests = AccessRule.MEMBER.requestMatcher();
    private final MemberActivity memberActivity;
    private final LoginSession loginSession;
    private final HandlerExceptionResolver handlerExceptionResolver;

    public ActiveMemberFilter(
        MemberActivity memberActivity,
        LoginSession loginSession,
        HandlerExceptionResolver handlerExceptionResolver
    ) {
        this.memberActivity = memberActivity;
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
        if (memberRequests.matches(request)
            && authentication != null
            && authentication.getPrincipal() instanceof LoginMember member
            && !memberActivity.isActive(member.id())) {
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
