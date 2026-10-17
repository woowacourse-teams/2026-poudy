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
    public boolean register(String token, Long userId) {
        return pushTokenRepository.save(token, userId);
    }

    @Transactional
    public void changeEnabled(String token, Long userId, boolean enabled) {
        pushTokenRepository.saveEnabled(token, userId, enabled);
    }
}
