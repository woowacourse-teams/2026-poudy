package com.poudy.security.login;

import com.poudy.security.domain.SocialLoginResult;

public interface LoginResponder<R> {

    R succeeded(SocialLoginResult result);

    R failed(RuntimeException exception);
}
