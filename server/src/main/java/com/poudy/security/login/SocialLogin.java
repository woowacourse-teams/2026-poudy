package com.poudy.security.login;

import com.poudy.security.domain.SocialLoginResult;
import com.poudy.security.domain.SocialMemberLogin;
import com.poudy.security.session.LoginSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

@Component
public class SocialLogin {

    private final SocialMemberLogin socialMemberLogin;
    private final LoginSession loginSession;

    public SocialLogin(SocialMemberLogin socialMemberLogin, LoginSession loginSession) {
        this.socialMemberLogin = socialMemberLogin;
        this.loginSession = loginSession;
    }

    public <T extends LoginCredential, R> R login(
        SocialAccountReader<T> reader,
        T credential,
        LoginResponder<R> responder,
        HttpServletRequest request,
        HttpServletResponse response
    ) {
        try {
            SocialLoginResult result = socialMemberLogin.login(reader.read(credential));
            loginSession.signOut(request, response);
            loginSession.applyLoginResult(result, credential.channel(), request, response);
            return responder.succeeded(result);
        } catch (RuntimeException exception) {
            loginSession.signOut(request, response);
            return responder.failed(exception);
        }
    }
}
