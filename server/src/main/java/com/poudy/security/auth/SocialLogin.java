package com.poudy.security.auth;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.SocialLoginResult;
import com.poudy.security.domain.SocialMembers;
import com.poudy.security.session.LoginChannel;
import com.poudy.security.session.LoginSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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

    public SocialLoginResult login(
        Supplier<OAuthAccount> account,
        LoginChannel channel,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        try {
            SocialLoginResult result = socialMembers.login(account.get());
            loginSession.signOut(request, response);
            loginSession.applyLoginResult(result, channel, request, response);
            return result;
        } catch (RuntimeException exception) {
            loginSession.signOut(request, response);
            throw exception;
        }
    }
}
