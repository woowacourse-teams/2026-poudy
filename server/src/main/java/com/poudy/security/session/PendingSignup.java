package com.poudy.security.session;

import com.poudy.security.domain.OAuthAccount;
import java.io.Serializable;

public record PendingSignup(OAuthAccount account, LoginChannel channel) implements Serializable {
}
