package com.poudy.shelf.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.shelf.domain.RaterProfile;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.ShelfRatingHistory;
import com.poudy.shelf.domain.ShelfRatingRecord;
import com.poudy.shelf.domain.ShelfUsageStatus;
import com.poudy.shelf.repository.ShelfRatingHistoryRepository;
import com.poudy.user.domain.User;
import com.poudy.user.repository.UserRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShelfRatingHistoryService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final ShelfRatingHistoryRepository shelfRatingHistoryRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    public ShelfRatingHistoryService(
        ShelfRatingHistoryRepository shelfRatingHistoryRepository,
        UserRepository userRepository,
        Clock clock
    ) {
        this.shelfRatingHistoryRepository = shelfRatingHistoryRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    // 평가를 저장한 트랜잭션 안에 세이브포인트를 두고 쓴다. 실패하면 이력 쓰기만 세이브포인트까지 되돌리고 예외를 던진다.
    @Transactional(propagation = Propagation.NESTED)
    public void record(long userId, long productId, ShelfUsageStatus usageStatus, Rating rating) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND));
        ShelfRatingRecord record = new ShelfRatingRecord(
            usageStatus,
            rating,
            RaterProfile.of(user),
            LocalDate.ofInstant(clock.instant(), SEOUL)
        );
        ShelfRatingHistory history = shelfRatingHistoryRepository.findCurrent(userId, productId);
        if (history.needsRecord(record)) {
            shelfRatingHistoryRepository.supersede(history.supersededBy(record));
            shelfRatingHistoryRepository.add(userId, productId, record);
        }
    }
}
