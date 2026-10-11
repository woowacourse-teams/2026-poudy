package com.poudy.security.auth;

import com.poudy.security.domain.LoginStatus;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.SocialLoginResult;
import com.poudy.security.domain.SocialMembers;
import com.poudy.security.session.LoginChannel;
import com.poudy.security.session.LoginSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Optional;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;

@Component
public class SocialLogin {

    private final SocialMembers socialMembers;
    private final LoginSession loginSession;

    public SocialLogin(SocialMembers socialMembers, LoginSession loginSession) {
        this.socialMembers = socialMembers;
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
            Optional<SocialLoginResult> result = socialMembers.login(loginAccount);
            loginSession.signOut(request, response);
            return result.map(member -> loginSession.applyLoginResult(member, channel, request, response))
                .orElseGet(() -> loginSession.holdSignup(loginAccount, channel, request, response));
        } catch (RuntimeException exception) {
            loginSession.signOut(request, response);
            throw exception;
        }
    }
}
