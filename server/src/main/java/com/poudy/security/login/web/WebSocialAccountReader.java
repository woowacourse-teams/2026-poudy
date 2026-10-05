package com.poudy.security.login.web;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.login.SocialAccountReader;
import org.springframework.stereotype.Component;

@Component
public class WebSocialAccountReader implements SocialAccountReader<WebLoginCredential> {

    @Override
    public OAuthAccount read(WebLoginCredential credential) {
        return OAuthAccount.from(credential.registrationId(), credential.attributes());
    }
}
