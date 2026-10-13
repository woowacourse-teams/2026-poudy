package com.poudy.security.auth.oauth;

import com.poudy.security.session.LoginChannel;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.io.Serial;
import java.io.Serializable;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;

public final class OAuthLoginStart implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private static final String ATTRIBUTE = OAuthLoginStart.class.getName();
    private static final OAuthLoginStart UNKNOWN = new OAuthLoginStart(null, null, LoginChannel.WEB);

    private final @Nullable String state;
    private final @Nullable String returnOrigin;
    private final LoginChannel channel;

    public OAuthLoginStart(@Nullable String state, @Nullable String returnOrigin, LoginChannel channel) {
        this.state = state;
        this.returnOrigin = returnOrigin;
        this.channel = channel;
    }

    public static OAuthLoginStart unknown() {
        return UNKNOWN;
    }

    public static OAuthLoginStart takeFrom(HttpServletRequest request) {
        Optional<OAuthLoginStart> start = rememberedFor(request);
        start.ifPresent(remembered -> forget(request));
        return start.orElse(UNKNOWN);
    }

    public void rememberIn(HttpServletRequest request) {
        request.getSession().setAttribute(ATTRIBUTE, this);
    }

    public String returnOriginOr(String defaultOrigin) {
        if (returnOrigin == null) {
            return defaultOrigin;
        }
        return returnOrigin;
    }

    public LoginChannel channel() {
        return channel;
    }

    private boolean startedBy(@Nullable String callbackState) {
        return state != null && state.equals(callbackState);
    }

    private static Optional<OAuthLoginStart> rememberedFor(HttpServletRequest request) {
        return rememberedIn(request.getSession(false)).filter(start -> start.startedBy(callbackStateOf(request)));
    }

    private static Optional<OAuthLoginStart> rememberedIn(@Nullable HttpSession session) {
        if (session != null && session.getAttribute(ATTRIBUTE) instanceof OAuthLoginStart start) {
            return Optional.of(start);
        }
        return Optional.empty();
    }

    private static @Nullable String callbackStateOf(HttpServletRequest request) {
        return request.getParameter(OAuth2ParameterNames.STATE);
    }

    private static void forget(HttpServletRequest request) {
        request.getSession().removeAttribute(ATTRIBUTE);
    }
}
