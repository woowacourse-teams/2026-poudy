package com.poudy.user.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.SocialLoginResult;
import com.poudy.security.domain.SocialUsers;
import com.poudy.security.domain.UserActivity;
import com.poudy.security.domain.WithdrawnAccount;
import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import com.poudy.user.domain.RestoreRequestPage;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService implements SocialUsers, UserActivity {

    private final UserRepository userRepository;
    private final Duration retention;

    public UserService(
        UserRepository userRepository,
        @Value("${poudy.user.retention.max-age:P30D}") Duration retention
    ) {
        this.userRepository = userRepository;
        this.retention = retention;
    }

    @Override
    public boolean isActive(long userId) {
        return userRepository.isActive(userId);
    }

    @Override
    public Optional<SocialLoginResult> login(OAuthAccount account) {
        Optional<User> user = userRepository.findByAccount(account);
        if (user.isEmpty()) {
            checkRegistrable(UserSignup.from(account));
        }
        return user.map(User::loginResult);
    }

    @Override
    @Transactional
    public long signUp(OAuthAccount account) {
        UserSignup signup = UserSignup.from(account);
        checkRegistrable(signup);
        return userRepository.save(signup).id();
    }

    @Override
    public WithdrawnAccount findWithdrawn(long withdrawnUserId) {
        return userRepository.findWithdrawnById(withdrawnUserId)
            .map(user -> user.keptFor(retention))
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.WITHDRAWN_MEMBER_NOT_FOUND));
    }

    @Override
    @Transactional
    public void requestRestore(long withdrawnUserId) {
        if (!userRepository.requestRestore(withdrawnUserId)) {
            throw new ResourceNotFoundException(ErrorCode.WITHDRAWN_MEMBER_NOT_FOUND);
        }
    }

    public User findById(long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND));
    }

    @Transactional
    public User updateProfile(long userId, Gender gender, AgeRange ageRange, SkinType skinType) {
        return userRepository.updateProfile(userId, gender, ageRange, skinType)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND));
    }

    @Transactional
    public void withdraw(long userId) {
        if (!userRepository.withdraw(userId)) {
            throw new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND);
        }
    }

    public RestoreRequestPage findRestoreRequests(int page, int size) {
        long totalElements = userRepository.countRestoreRequests();
        long offset = (long) (page - 1) * size;
        if (offset >= totalElements) {
            return new RestoreRequestPage(List.of(), totalElements);
        }
        return new RestoreRequestPage(userRepository.findRestoreRequests(offset, size), totalElements);
    }

    @Transactional
    public void restore(long userId) {
        if (!userRepository.restore(userId)) {
            throw new ResourceNotFoundException(ErrorCode.RESTORE_REQUEST_NOT_FOUND);
        }
    }

    private void checkRegistrable(UserSignup signup) {
        userRepository.findByEmail(signup.email()).ifPresent(registered -> {
            throw new EmailAlreadyRegisteredException(registered.registeredAccount());
        });
    }
}
