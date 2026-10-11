package com.poudy.security.session;

import com.poudy.security.domain.LoginStatus;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.SocialLoginResult;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
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
    private static final String PENDING_SIGNUP = LoginSession.class.getName() + ".pendingSignup";
    private static final String GRACED_IDLE_TIMEOUT = LoginSession.class.getName() + ".gracedIdleTimeout";
    private static final Duration HOLD_TIMEOUT = Duration.ofMinutes(10);

    private final Map<LoginChannel, SessionPolicy> policies;
    private final Clock clock;
    private final SecurityContextRepository securityContextRepository;
    private final SecurityContextHolderStrategy securityContextHolderStrategy = SecurityContextHolder
        .getContextHolderStrategy();
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    public LoginSession(
        List<SessionPolicy> policies,
        Clock clock,
        SecurityContextRepository securityContextRepository
    ) {
        this.policies = policies.stream().collect(Collectors.toMap(SessionPolicy::channel, Function.identity()));
        this.clock = clock;
        this.securityContextRepository = securityContextRepository;
    }

    public LoginStatus applyLoginResult(
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
        return result.status();
    }

    public void signIn(long memberId, LoginChannel channel, HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = start(new LoginMember(memberId).toAuthentication(), channel, request, response);
        session.removeAttribute(WITHDRAWN_MEMBER_ID);
        session.removeAttribute(PENDING_SIGNUP);
    }

    public void signInAdmin(String username, HttpServletRequest request, HttpServletResponse response) {
        signOut(request, response);
        start(new LoginAdmin(username).toAuthentication(), LoginChannel.ADMIN, request, response);
    }

    public void holdWithdrawnMember(long memberId, HttpServletRequest request, HttpServletResponse response) {
        hold(WITHDRAWN_MEMBER_ID, memberId, request, response);
    }

    public Optional<Long> releaseWithdrawnMember(HttpServletRequest request) {
        return release(WITHDRAWN_MEMBER_ID, Long.class, request);
    }

    public LoginStatus holdSignup(
        OAuthAccount account,
        LoginChannel channel,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        hold(PENDING_SIGNUP, new PendingSignup(account, channel), request, response);
        return LoginStatus.SIGNUP_REQUIRED;
    }

    public Optional<PendingSignup> releaseSignup(HttpServletRequest request) {
        return release(PENDING_SIGNUP, PendingSignup.class, request);
    }

    public void signOut(HttpServletRequest request, HttpServletResponse response) {
        logoutHandler.logout(request, response, null);
    }

    public void refresh(HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return;
        }
        if (session.getAttribute(GRACED_IDLE_TIMEOUT) instanceof Integer idleSeconds) {
            session.setMaxInactiveInterval(idleSeconds);
            session.removeAttribute(GRACED_IDLE_TIMEOUT);
        }
        if (session.getAttribute(CHANNEL) instanceof LoginChannel channel) {
            policies.get(channel).refresh(session, response);
        }
    }

    public void grace(HttpSession session, Duration grace) {
        graceIdleTimeout(session, grace);
        if (session.getAttribute(CHANNEL) instanceof LoginChannel channel) {
            policies.get(channel).grace(session, grace);
        }
    }

    private void graceIdleTimeout(HttpSession session, Duration grace) {
        int idleSeconds = session.getMaxInactiveInterval();
        Instant idleDeadline = Instant.ofEpochMilli(session.getLastAccessedTime()).plusSeconds(idleSeconds);
        if (idleSeconds <= 0 || !clock.instant().plus(grace).isAfter(idleDeadline)) {
            return;
        }
        if (!(session.getAttribute(GRACED_IDLE_TIMEOUT) instanceof Integer)) {
            session.setAttribute(GRACED_IDLE_TIMEOUT, idleSeconds);
        }
        session.setMaxInactiveInterval(idleSeconds + Math.toIntExact(grace.toSeconds()));
    }

    private void hold(String name, Object value, HttpServletRequest request, HttpServletResponse response) {
        signOut(request, response);
        HttpSession session = request.getSession();
        session.setMaxInactiveInterval(Math.toIntExact(HOLD_TIMEOUT.toSeconds()));
        session.setAttribute(name, value);
    }

    private <T> Optional<T> release(String name, Class<T> type, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !type.isInstance(session.getAttribute(name))) {
            return Optional.empty();
        }
        T value = type.cast(session.getAttribute(name));
        session.removeAttribute(name);
        return Optional.of(value);
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
