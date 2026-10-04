package com.poudy.security.session;

import java.io.Serializable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;

public record LoginMember(long id) implements Serializable {

    private static final String MEMBER_AUTHORITY = "ROLE_MEMBER";

    public Authentication toAuthentication() {
        return UsernamePasswordAuthenticationToken.authenticated(
            this,
            null,
            AuthorityUtils.createAuthorityList(MEMBER_AUTHORITY)
        );
    }
}
