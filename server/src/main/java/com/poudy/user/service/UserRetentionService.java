package com.poudy.user.service;

import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.repository.PendingImageRepository;
import com.poudy.user.domain.WithdrawnUserPurge;
import com.poudy.user.repository.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name = "poudy.user.retention.enabled", havingValue = "true")
public class UserRetentionService {

    private static final Logger log = LoggerFactory.getLogger(UserRetentionService.class);

    private final UserRepository userRepository;
    private final PendingImageRepository pendingImageRepository;
    private final Clock clock;
    private final Duration maxAge;

    public UserRetentionService(
        UserRepository userRepository,
        PendingImageRepository pendingImageRepository,
        Clock clock,
        @Value("${poudy.user.retention.max-age:P30D}") Duration maxAge
    ) {
        if (maxAge.isNegative() || maxAge.isZero()) {
            throw new IllegalArgumentException("탈퇴 회원 보관 기간은 0보다 길어야 합니다.");
        }
        this.userRepository = userRepository;
        this.pendingImageRepository = pendingImageRepository;
        this.clock = clock;
        this.maxAge = maxAge;
    }

    @Scheduled(cron = "${poudy.user.retention.cron:0 40 3 * * *}", zone = "Asia/Seoul")
    @Transactional
    public void purgeExpired() {
        OffsetDateTime cutoff = OffsetDateTime.now(clock).minus(maxAge);
        WithdrawnUserPurge purge = userRepository.deleteWithdrawnBefore(cutoff);
        pendingImageRepository.discard(purge.profileImageIds(), ImagePurpose.PROFILE);
        int deleted = purge.deletedCount();
        if (deleted > 0) {
            log.info("보관 기간이 지난 탈퇴 회원을 삭제했습니다. deleted={}", deleted);
        }
    }
}
