package com.poudy.security.auth;

import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.LoginStatus;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.SocialLoginResult;
import com.poudy.security.domain.SocialUsers;
import com.poudy.security.session.LoginChannel;
import com.poudy.security.session.LoginSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

@Component
public class SocialLogin {

    private final SocialUsers socialUsers;
    private final LoginSession loginSession;

    public SocialLogin(SocialUsers socialUsers, LoginSession loginSession) {
        this.socialUsers = socialUsers;
        this.loginSession = loginSession;
    }

    public LoginStatus login(
        Supplier<OAuthAccount> account,
        LoginChannel channel,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        try {
            OAuthAccount loginAccount = account.get();
            Optional<SocialLoginResult> result = socialUsers.login(loginAccount);
            loginSession.signOut(request, response);
            return result.map(user -> loginSession.applyLoginResult(user, channel, request, response))
                .orElseGet(() -> loginSession.holdSignup(loginAccount, channel, request, response));
        } catch (EmailAlreadyRegisteredException exception) {
            loginSession.holdRegisteredAccount(exception.registeredAccount(), request, response);
            throw exception;
        } catch (RuntimeException exception) {
            loginSession.signOut(request, response);
            throw exception;
        }
    }
}
