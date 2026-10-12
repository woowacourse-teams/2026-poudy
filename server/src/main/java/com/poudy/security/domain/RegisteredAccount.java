package com.poudy.security.domain;

import java.io.Serializable;

public record RegisteredAccount(OAuthProvider provider, String email) implements Serializable {
}
