package com.poudy.image.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.PendingImage;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@DisplayName("임시 이미지 저장소")
class PendingImageRepositoryTest {

    private static final Instant NOW = Instant.parse("2026-10-31T03:00:00Z");

    @Autowired
    private PendingImageRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clear() {
        jdbcTemplate.update("delete from pending_image");
    }

    @Test
    @DisplayName("만료 전인 같은 용도의 임시 이미지만 차지하고 차지한 행을 지운다")
    void claimsOnlyUnexpiredImagesOfPurpose() {
        UUID fresh = save(NOW.minus(Duration.ofHours(23)));
        UUID expired = save(PendingImage.claimableSince(NOW));

        List<UUID> claimed = repository.claim(List.of(fresh, expired, UUID.randomUUID()), ImagePurpose.FEEDBACK, NOW);

        assertThat(claimed).containsExactly(fresh);
        assertThat(repository.claim(List.of(fresh), ImagePurpose.FEEDBACK, NOW)).isEmpty();
        assertThat(count()).isOne();
    }

    @Test
    @DisplayName("만료 뒤 유예 시간까지 지난 임시 이미지만 오래된 순서로 요청한 개수만큼 찾는다")
    void findsExpiredAfterGracePeriod() {
        Instant cutoff = PendingImage.cleanupCutoff(NOW);
        UUID oldest = save(cutoff.minus(Duration.ofMinutes(2)));
        UUID older = save(cutoff);
        save(cutoff.plus(Duration.ofMinutes(1)));

        assertThat(repository.findExpired(NOW, 10)).extracting(PendingImage::id).containsExactly(oldest, older);
        assertThat(repository.findExpired(NOW, 1)).extracting(PendingImage::id).containsExactly(oldest);
        assertThat(repository.findExpired(NOW, 10)).extracting(PendingImage::purpose)
            .containsOnly(ImagePurpose.FEEDBACK);
    }

    @Test
    @DisplayName("지울 이미지는 이미 만료된 행으로 넣어 차지할 수 없고 정리 대상에 바로 들어간다")
    void discardsImageAsExpiredRow() {
        UUID discarded = UUID.randomUUID();

        repository.discard(List.of(discarded), ImagePurpose.PROFILE);
        repository.discard(List.of(discarded), ImagePurpose.PROFILE);

        assertThat(repository.claim(List.of(discarded), ImagePurpose.PROFILE, NOW)).isEmpty();
        assertThat(repository.findExpired(NOW, 10)).extracting(PendingImage::id).containsExactly(discarded);
        assertThat(repository.findExpired(NOW, 10)).extracting(PendingImage::purpose)
            .containsExactly(ImagePurpose.PROFILE);
    }

    @Test
    @DisplayName("행을 지운다")
    void deletes() {
        UUID id = save(NOW);

        repository.delete(id);

        assertThat(count()).isZero();
    }

    private UUID save(Instant createdAt) {
        UUID id = UUID.randomUUID();
        repository.save(new PendingImage(id, ImagePurpose.FEEDBACK), createdAt);
        return id;
    }

    private long count() {
        return jdbcTemplate.queryForObject("select count(*) from pending_image", Long.class);
    }
}
