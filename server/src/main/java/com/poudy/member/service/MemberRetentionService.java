package com.poudy.member.service;

import com.poudy.member.repository.MemberRepository;
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
@ConditionalOnProperty(name = "poudy.member.retention.enabled", havingValue = "true")
public class MemberRetentionService {

    private static final Logger log = LoggerFactory.getLogger(MemberRetentionService.class);

    private final MemberRepository memberRepository;
    private final Clock clock;
    private final Duration maxAge;

    public MemberRetentionService(
        MemberRepository memberRepository,
        Clock clock,
        @Value("${poudy.member.retention.max-age:P30D}") Duration maxAge
    ) {
        if (maxAge.isNegative() || maxAge.isZero()) {
            throw new IllegalArgumentException("탈퇴 회원 보관 기간은 0보다 길어야 합니다.");
        }
        this.memberRepository = memberRepository;
        this.clock = clock;
        this.maxAge = maxAge;
    }

    @Scheduled(cron = "${poudy.member.retention.cron:0 40 3 * * *}", zone = "Asia/Seoul")
    public void purgeExpired() {
        int deleted = memberRepository.deleteWithdrawnBefore(OffsetDateTime.now(clock).minus(maxAge));
        if (deleted > 0) {
            log.info("보관 기간이 지난 탈퇴 회원을 삭제했습니다. deleted={}", deleted);
        }
    }
}
