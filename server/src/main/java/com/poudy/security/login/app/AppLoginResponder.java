package com.poudy.security.login.app;

import com.poudy.security.domain.SocialLoginResult;
import com.poudy.security.login.LoginResponder;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

@Component
public class AppLoginResponder implements LoginResponder<ResponseEntity<AppLoginResponse>> {

    @Override
    public ResponseEntity<AppLoginResponse> succeeded(SocialLoginResult result) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(new AppLoginResponse(result.status()));
    }

    @Override
    public ResponseEntity<AppLoginResponse> failed(RuntimeException exception) {
        throw exception;
    }
}
