package com.poudy.pushtoken.service;

import com.poudy.pushtoken.repository.PushTokenRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "poudy.push-token.retention.enabled", havingValue = "true")
public class PushTokenRetentionService {

    private static final Logger log = LoggerFactory.getLogger(PushTokenRetentionService.class);

    private final PushTokenRepository pushTokenRepository;
    private final Clock clock;
    private final Duration maxAge;

    public PushTokenRetentionService(
        PushTokenRepository pushTokenRepository,
        Clock clock,
        @Value("${poudy.push-token.retention.max-age:P365D}") Duration maxAge
    ) {
        if (maxAge.isNegative() || maxAge.isZero()) {
            throw new IllegalArgumentException("푸시 토큰 보관 기간은 0보다 길어야 합니다.");
        }
        this.pushTokenRepository = pushTokenRepository;
        this.clock = clock;
        this.maxAge = maxAge;
    }

    @Scheduled(cron = "${poudy.push-token.retention.cron:0 50 3 * * *}", zone = "Asia/Seoul")
    public void purgeExpired() {
        int deleted = pushTokenRepository.deleteRegisteredBefore(OffsetDateTime.now(clock).minus(maxAge));
        if (deleted > 0) {
            log.info("보관 기간이 지난 푸시 토큰을 삭제했습니다. deleted={}", deleted);
        }
    }
}
