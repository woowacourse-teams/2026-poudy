package com.poudy.pushtoken.service;

import com.poudy.pushtoken.repository.PushTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PushTokenService {

    private final PushTokenRepository pushTokenRepository;

    public PushTokenService(PushTokenRepository pushTokenRepository) {
        this.pushTokenRepository = pushTokenRepository;
    }

    @Transactional
    public void registerAnonymous(String token) {
        pushTokenRepository.saveAnonymous(token);
    }

    @Transactional
    public void registerForUser(String token, long userId) {
        pushTokenRepository.saveForUser(token, userId);
    }
}
