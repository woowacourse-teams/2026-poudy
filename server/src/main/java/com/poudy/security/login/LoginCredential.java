package com.poudy.security.login;

import com.poudy.security.session.LoginChannel;

public interface LoginCredential {

    LoginChannel channel();
}
