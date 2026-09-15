package com.poudy.admin.service;

import org.springframework.stereotype.Service;

@Service
public class AdminLoginService {

    private final AdminCredentialVerifier credentialVerifier;

    public AdminLoginService(AdminCredentialVerifier credentialVerifier) {
        this.credentialVerifier = credentialVerifier;
    }

    public boolean login(String username, String password) {
        return credentialVerifier.verify(username, password);
    }
}
