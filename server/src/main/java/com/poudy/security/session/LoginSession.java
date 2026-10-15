package com.poudy.security.session;

import com.poudy.security.domain.LoginStatus;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.RegisteredAccount;
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
    private static final String WITHDRAWN_USER_ID = LoginSession.class.getName() + ".withdrawnUserId";
    private static final String PENDING_SIGNUP = LoginSession.class.getName() + ".pendingSignup";
    private static final String REGISTERED_ACCOUNT = LoginSession.class.getName() + ".registeredAccount";
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
            case SIGNED_IN -> signIn(result.userId(), channel, request, response);
            case WITHDRAWN -> holdWithdrawnUser(result.userId(), request, response);
            case RESTORE_REQUESTED -> signOut(request, response);
        }
        return result.status();
    }

    public void signIn(long userId, LoginChannel channel, HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = start(new LoginMember(userId).toAuthentication(), channel, request, response);
        session.removeAttribute(WITHDRAWN_USER_ID);
        session.removeAttribute(PENDING_SIGNUP);
        session.removeAttribute(REGISTERED_ACCOUNT);
    }

    public void signInAdmin(String username, HttpServletRequest request, HttpServletResponse response) {
        signOut(request, response);
        start(new LoginAdmin(username).toAuthentication(), LoginChannel.ADMIN, request, response);
    }

    public void holdWithdrawnUser(long userId, HttpServletRequest request, HttpServletResponse response) {
        hold(WITHDRAWN_USER_ID, userId, request, response);
    }

    public Optional<Long> findWithdrawnUser(HttpServletRequest request) {
        return find(WITHDRAWN_USER_ID, Long.class, request);
    }

    public Optional<Long> releaseWithdrawnUser(HttpServletRequest request) {
        return release(WITHDRAWN_USER_ID, Long.class, request);
    }

    public void holdRegisteredAccount(
        RegisteredAccount account,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        hold(REGISTERED_ACCOUNT, account, request, response);
    }

    public Optional<RegisteredAccount> findRegisteredAccount(HttpServletRequest request) {
        return find(REGISTERED_ACCOUNT, RegisteredAccount.class, request);
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
        Optional<T> value = find(name, type, request);
        value.ifPresent(found -> request.getSession().removeAttribute(name));
        return value;
    }

    private <T> Optional<T> find(String name, Class<T> type, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !type.isInstance(session.getAttribute(name))) {
            return Optional.empty();
        }
        return Optional.of(type.cast(session.getAttribute(name)));
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
