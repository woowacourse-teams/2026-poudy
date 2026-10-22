package com.poudy.user.service;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.user.domain.RecoveryAccount;
import com.poudy.user.domain.RetainedUserData;
import com.poudy.user.repository.RecoveryRepository;
import java.util.List;
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

    public RetainedUserData retainedData(long id) {
        return repository.retainedData(id);
    }

    public long available(boolean soon) {
        return repository.available(soon);
    }

}
