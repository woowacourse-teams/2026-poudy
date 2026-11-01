package com.poudy.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.ConflictException;
import com.poudy.exception.ErrorCode;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.InvalidImageIdException;
import com.poudy.image.domain.PendingImage;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.skintype.domain.SkinType;
import com.poudy.user.domain.AgeRange;
import com.poudy.user.domain.Gender;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
@DisplayName("닉네임 수정 트랜잭션")
class UserNicknameUpdateTest {

    @Autowired
    private UserService service;

    @Autowired
    private UserRepository repository;

    @Autowired
    private PendingImageRepository pendingImages;

    @Autowired
    private JdbcTemplate jdbc;

    private final List<Long> userIds = new ArrayList<>();
    private final List<UUID> imageIds = new ArrayList<>();

    @AfterEach
    void cleanUp() {
        userIds.forEach(id -> jdbc.update("delete from \"user\" where id = ?", id));
        imageIds.forEach(pendingImages::delete);
    }

    @Test
    @DisplayName("두 회원이 같은 닉네임을 동시에 저장하면 한 명만 성공한다")
    void resolvesRaceUsingUniqueConstraint() throws Exception {
        User first = createUser("첫번째 수달");
        User second = createUser("두번째 수달");
        String wanted = "동시에 고른 수달";
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var results = List.of(first, second).stream().map(user -> executor.submit(() -> {
                ready.countDown();
                assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
                try {
                    service.updateProfile(user.id(), null, null, null, null, false, null, wanted);
                    return true;
                } catch (ConflictException exception) {
                    assertThat(exception.code()).isEqualTo(ErrorCode.NICKNAME_ALREADY_EXISTS);
                    return false;
                }
            })).toList();
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(List.of(results.get(0).get(10, TimeUnit.SECONDS), results.get(1).get(10, TimeUnit.SECONDS)))
                .containsExactlyInAnyOrder(true, false);
        }
        assertThat(jdbc.queryForObject("select count(*) from \"user\" where nickname = ?", Integer.class, wanted))
            .isEqualTo(1);
    }

    @Test
    @DisplayName("닉네임 충돌이면 프로필 변경과 새 이미지 사용·이전 이미지 폐기도 함께 롤백한다")
    void rollsBackProfileAndImageClaimsOnConflict() {
        User first = createUser("첫번째 수달");
        createUser("이미 쓰는 수달");
        UUID oldImage = imageId();
        UUID newImage = imageId();
        repository.updateProfile(first.id(), Gender.FEMALE, AgeRange.TWENTIES, SkinType.DRY, true, oldImage);
        pendingImages.save(new PendingImage(newImage, ImagePurpose.PROFILE), Instant.now());

        assertThatThrownBy(
            () -> service.updateProfile(
                first.id(),
                Gender.MALE,
                AgeRange.THIRTIES,
                SkinType.OILY,
                false,
                true,
                newImage,
                "이미 쓰는 수달",
                true
            )
        ).isInstanceOfSatisfying(
            ConflictException.class,
            exception -> assertThat(exception.code()).isEqualTo(ErrorCode.NICKNAME_ALREADY_EXISTS)
        );

        User saved = repository.findById(first.id()).orElseThrow();
        assertThat(saved.nickname()).isEqualTo(first.nickname());
        assertThat(saved.profileSetupCompleted()).isFalse();
        assertThat(saved.gender()).isEqualTo(Gender.FEMALE);
        assertThat(saved.ageRange()).isEqualTo(AgeRange.TWENTIES);
        assertThat(saved.skinType()).isEqualTo(SkinType.DRY);
        assertThat(saved.sensitiveSkin()).isTrue();
        assertThat(saved.profileImageId()).contains(oldImage);
        assertThat(jdbc.queryForObject("select count(*) from pending_image where id = ?", Integer.class, newImage))
            .isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from pending_image where id = ?", Integer.class, oldImage))
            .isZero();
    }

    @Test
    @DisplayName("이미지 연결에 실패하면 닉네임과 프로필 완료 상태를 모두 바꾸지 않는다")
    void doesNotChangeNicknameOrCompleteSetupWhenImageIsInvalid() {
        User user = createUser("첫번째 수달");
        assertThatThrownBy(
            () -> service.updateProfile(
                user.id(),
                null,
                null,
                null,
                null,
                true,
                UUID.randomUUID(),
                "새로운 수달",
                true
            )
        ).isInstanceOf(InvalidImageIdException.class);
        User saved = repository.findById(user.id()).orElseThrow();
        assertThat(saved.nickname()).isEqualTo(user.nickname());
        assertThat(saved.profileSetupCompleted()).isFalse();
    }

    @Test
    @DisplayName("내 닉네임은 재저장할 수 있고 탈퇴 회원의 닉네임은 파기 전까지 예약한다")
    void preservesNicknameOwnershipUntilPurge() {
        User first = createUser("첫번째 수달");
        User second = createUser("두번째 수달");
        assertThat(service.updateProfile(first.id(), null, null, null, null, false, null, first.nickname()).nickname())
            .isEqualTo(first.nickname());
        repository.withdraw(second.id());
        assertThatThrownBy(
            () -> service.updateProfile(first.id(), null, null, null, null, false, null, second.nickname())
        )
            .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("영문 대소문자는 기존 DB 유니크 제약처럼 구분한다")
    void distinguishesCaseForUniqueness() {
        User first = createUser("First otter");
        User second = createUser("Second otter");
        assertThat(service.updateProfile(second.id(), null, null, null, null, false, null, "first otter").nickname())
            .isEqualTo("first otter");
        assertThat(repository.findById(first.id()).orElseThrow().nickname()).isEqualTo("First otter");
    }

    private User createUser(String nickname) {
        String identity = UUID.randomUUID().toString();
        User user = repository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, identity, identity + "@example.com", true)),
            nickname
        ).orElseThrow();
        userIds.add(user.id());
        return user;
    }

    private UUID imageId() {
        UUID id = UUID.randomUUID();
        imageIds.add(id);
        return id;
    }
}
