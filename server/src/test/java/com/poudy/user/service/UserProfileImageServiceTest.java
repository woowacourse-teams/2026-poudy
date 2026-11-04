package com.poudy.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;

import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.image.repository.S3ImageRepository;
import com.poudy.image.service.ImageUploadService;
import com.poudy.user.ratelimit.ProfileUpdateRateLimiter;
import com.poudy.user.repository.NicknameSequenceRepository;
import com.poudy.user.repository.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@DisplayName("프로필 이미지 업로드")
class UserProfileImageServiceTest {

    private final ImageUploadService imageUploadService = mock(ImageUploadService.class);
    private final UserService service = new UserService(
        mock(UserRepository.class),
        mock(NicknameSequenceRepository.class),
        mock(PendingImageRepository.class),
        mock(S3ImageRepository.class),
        imageUploadService,
        mock(ProfileUpdateRateLimiter.class),
        mock(ApplicationEventPublisher.class),
        Clock.systemUTC(),
        Duration.ofDays(30)
    );

    @Test
    @DisplayName("한 장만 받아 검증한 뒤 프로필 용도의 임시 이미지로 올린다")
    void uploadsSingleProfileImage() {
        MultipartFile image = new MockMultipartFile("image", new byte[] {1});
        UUID imageId = UUID.randomUUID();
        given(imageUploadService.upload(List.of(image), ImagePurpose.PROFILE)).willReturn(List.of(imageId));

        assertThat(service.uploadProfileImage(image)).isEqualTo(imageId);
        InOrder order = inOrder(imageUploadService);
        order.verify(imageUploadService).validate(List.of(image), 1);
        order.verify(imageUploadService).upload(List.of(image), ImagePurpose.PROFILE);
    }
}
