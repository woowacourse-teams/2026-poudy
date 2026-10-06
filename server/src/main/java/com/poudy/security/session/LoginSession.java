package com.poudy.security.session;

import com.poudy.security.domain.SocialLoginResult;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;

@Component
public class LoginSession {

    private static final String CHANNEL = LoginSession.class.getName() + ".channel";
    private static final String WITHDRAWN_MEMBER_ID = LoginSession.class.getName() + ".withdrawnMemberId";
    private static final Duration WITHDRAWN_HOLD_TIMEOUT = Duration.ofMinutes(10);

    private final Map<LoginChannel, SessionPolicy> policies;
    private final SecurityContextRepository securityContextRepository;
    private final SecurityContextHolderStrategy securityContextHolderStrategy = SecurityContextHolder
        .getContextHolderStrategy();
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    public LoginSession(List<SessionPolicy> policies, SecurityContextRepository securityContextRepository) {
        this.policies = policies.stream().collect(Collectors.toMap(SessionPolicy::channel, Function.identity()));
        this.securityContextRepository = securityContextRepository;
    }

    public void applyLoginResult(
        SocialLoginResult result,
        LoginChannel channel,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        switch (result.status()) {
            case SIGNED_IN -> signIn(result.memberId(), channel, request, response);
            case WITHDRAWN -> holdWithdrawnMember(result.memberId(), request, response);
            case RESTORE_REQUESTED -> signOut(request, response);
        }
    }

    public void signIn(long memberId, LoginChannel channel, HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = start(new LoginMember(memberId).toAuthentication(), channel, request, response);
        session.removeAttribute(WITHDRAWN_MEMBER_ID);
    }

    public void signInAdmin(String username, HttpServletRequest request, HttpServletResponse response) {
        signOut(request, response);
        start(new LoginAdmin(username).toAuthentication(), LoginChannel.ADMIN, request, response);
    }

    public void holdWithdrawnMember(long memberId, HttpServletRequest request, HttpServletResponse response) {
        signOut(request, response);
        HttpSession session = request.getSession();
        session.setMaxInactiveInterval(Math.toIntExact(WITHDRAWN_HOLD_TIMEOUT.toSeconds()));
        session.setAttribute(WITHDRAWN_MEMBER_ID, memberId);
    }

    public Optional<Long> releaseWithdrawnMember(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute(WITHDRAWN_MEMBER_ID) instanceof Long memberId)) {
            return Optional.empty();
        }
        session.removeAttribute(WITHDRAWN_MEMBER_ID);
        return Optional.of(memberId);
    }

    public void signOut(HttpServletRequest request, HttpServletResponse response) {
        logoutHandler.logout(request, response, null);
    }

    public void refresh(HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return;
        }
        if (session.getAttribute(CHANNEL) instanceof LoginChannel channel) {
            policies.get(channel).refresh(session, response);
        }
    }

    private HttpSession start(
        Authentication authentication,
        LoginChannel channel,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        SecurityContext context = securityContextHolderStrategy.createEmptyContext();
        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        HttpSession session = request.getSession();
        session.setAttribute(CHANNEL, channel);
        policies.get(channel).start(session);
        return session;
    }
}
