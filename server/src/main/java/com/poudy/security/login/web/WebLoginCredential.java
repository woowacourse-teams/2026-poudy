package com.poudy.security.login.web;

import com.poudy.security.login.LoginCredential;
import com.poudy.security.session.LoginChannel;
import java.util.Map;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

public record WebLoginCredential(OAuth2AuthenticationToken authentication) implements LoginCredential {

    @Override
    public LoginChannel channel() {
        return LoginChannel.WEB;
    }

    public String registrationId() {
        return authentication.getAuthorizedClientRegistrationId();
    }

    public Map<String, Object> attributes() {
        return authentication.getPrincipal().getAttributes();
    }
}
