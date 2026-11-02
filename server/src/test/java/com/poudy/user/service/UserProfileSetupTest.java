package com.poudy.user.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@DisplayName("가입 프로필 완료 상태")
class UserProfileSetupTest {

    @Autowired
    private UserService service;

    @Autowired
    private UserRepository repository;

    @Autowired
    private JdbcTemplate jdbc;

    private Long userId;

    @AfterEach
    void cleanUp() {
        if (userId != null) {
            jdbc.update("delete from \"user\" where id = ?", userId);
        }
    }

    @Test
    @DisplayName("신규 회원은 미완료로 시작하고 다시 로그인해도 미완료가 유지된다")
    void keepsIncompleteStateAcrossLogin() {
        OAuthAccount account = account();
        userId = service.signUp(account);
        assertThat(service.findById(userId).profileSetupCompleted()).isFalse();
        assertThat(service.login(account)).get().extracting(login -> login.userId()).isEqualTo(userId);
        assertThat(service.findById(userId).profileSetupCompleted()).isFalse();
    }

    @Test
    @DisplayName("다음에서 완료한 상태는 커밋되어 재로그인·기존 프로필 수정 뒤에도 유지된다")
    void commitsCompletionAndNeverResetsIt() {
        OAuthAccount account = account();
        User user = repository.save(UserSignup.from(account), "설정 확인 수달").orElseThrow();
        userId = user.id();
        service.updateProfile(userId, null, null, null, null, false, null, null, true);
        assertThat(service.login(account)).isPresent();
        assertThat(service.findById(userId).profileSetupCompleted()).isTrue();
        service.updateProfile(userId, null, null, null, null, false, null, null, false);
        assertThat(service.findById(userId).profileSetupCompleted()).isTrue();
    }

    @Test
    @DisplayName("기존 프로필 수정 요청만으로는 가입 완료를 기록하지 않는다")
    void ordinaryProfileUpdatesDoNotCompleteSetup() {
        userId = repository.save(UserSignup.from(account()), "설정 확인 수달").orElseThrow().id();
        service.updateProfile(userId, null, null, null, null, false, null, "산뜻한 수달");
        assertThat(service.findById(userId).profileSetupCompleted()).isFalse();
    }

    private OAuthAccount account() {
        String identity = UUID.randomUUID().toString();
        return new OAuthAccount(OAuthProvider.KAKAO, identity, identity + "@example.com", true);
    }
}
