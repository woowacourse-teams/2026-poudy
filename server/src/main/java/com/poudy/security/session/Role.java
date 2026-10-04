package com.poudy.security.session;

import org.springframework.security.core.Authentication;

public enum Role {
    MEMBER,
    ADMIN;

    private static final String AUTHORITY_PREFIX = "ROLE_";

    public String authority() {
        return AUTHORITY_PREFIX + name();
    }

    public boolean isGrantedTo(Authentication authentication) {
        return authentication != null
            && authentication.getAuthorities().stream().anyMatch(granted -> authority().equals(granted.getAuthority()));
    }
}
