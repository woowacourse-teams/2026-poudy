package com.poudy.admin.service;

public interface AdminCredentialVerifier {

    boolean verify(String username, String password);
}
