package com.poudy.user.service;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.user.domain.RecoveryAccount;
import com.poudy.user.repository.RecoveryRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class RecoveryService {
    private final RecoveryRepository repository;
    public RecoveryService(RecoveryRepository repository) {
        this.repository = repository;
    }

    public List<RecoveryAccount> find(String email, OAuthProvider provider, String status, long offset, int size) {
        return repository.find(email, provider, status, offset, size);
    }

    public long count(String email, OAuthProvider provider, String status) {
        return repository.count(email, provider, status);
    }

    public RecoveryAccount detail(long id) {
        return repository.detail(id);
    }

    public Map<String, Long> counts(long id) {
        return repository.counts(id);
    }

    public long available(boolean soon) {
        return repository.available(soon);
    }

    public Map<String, Long> monthly() {
        return repository.monthly();
    }

    public OffsetDateTime trackingStarted() {
        return repository.trackingStarted();
    }
}
