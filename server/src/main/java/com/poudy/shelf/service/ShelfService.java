package com.poudy.shelf.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import com.poudy.shelf.domain.AnalysisSnapshot;
import com.poudy.shelf.domain.IngredientAnalysis;
import com.poudy.shelf.domain.RaterProfile;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.Shelf;
import com.poudy.shelf.domain.ShelfItem;
import com.poudy.shelf.domain.ShelfProduct;
import com.poudy.shelf.domain.ShelfProductAlreadyExistsException;
import com.poudy.shelf.domain.ShelfRatingHistory;
import com.poudy.shelf.domain.ShelfRatingRecord;
import com.poudy.shelf.domain.ShelfUsageStatus;
import com.poudy.shelf.domain.SkinCautions;
import com.poudy.shelf.domain.SuspectCandidates;
import com.poudy.shelf.repository.ShelfAnalysisRepository;
import com.poudy.shelf.repository.ShelfCautionRepository;
import com.poudy.shelf.repository.ShelfProductRepository;
import com.poudy.shelf.repository.ShelfRatingHistoryRepository;
import com.poudy.skinfilter.repository.SkinFilterRepository;
import com.poudy.user.domain.User;
import com.poudy.user.repository.UserRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShelfService {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final ShelfProductRepository shelfProductRepository;
    private final ShelfCautionRepository shelfCautionRepository;
    private final ShelfAnalysisRepository shelfAnalysisRepository;
    private final ShelfRatingHistoryRepository shelfRatingHistoryRepository;
    private final ProductRepository productRepository;
    private final SkinFilterRepository skinFilterRepository;
    private final ExcludeCodeRepository excludeCodeRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    public ShelfService(
        ShelfProductRepository shelfProductRepository,
        ShelfCautionRepository shelfCautionRepository,
        ShelfAnalysisRepository shelfAnalysisRepository,
        ShelfRatingHistoryRepository shelfRatingHistoryRepository,
        ProductRepository productRepository,
        SkinFilterRepository skinFilterRepository,
        ExcludeCodeRepository excludeCodeRepository,
        UserRepository userRepository,
        Clock clock
    ) {
        this.shelfProductRepository = shelfProductRepository;
        this.shelfCautionRepository = shelfCautionRepository;
        this.shelfAnalysisRepository = shelfAnalysisRepository;
        this.shelfRatingHistoryRepository = shelfRatingHistoryRepository;
        this.productRepository = productRepository;
        this.skinFilterRepository = skinFilterRepository;
        this.excludeCodeRepository = excludeCodeRepository;
        this.userRepository = userRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Shelf findShelf(long userId) {
        return findShelf(userId, excludeCodeRepository.findAll());
    }

    private Shelf findShelf(long userId, ExcludeCodes excludeCodes) {
        List<ShelfProduct> shelfProducts = shelfProductRepository.findAll(userId);
        List<Long> productIds = shelfProducts.stream()
            .map(ShelfProduct::productId)
            .toList();
        return Shelf.of(shelfProducts, productRepository.findAllById(productIds), candidatesOf(userId, excludeCodes));
    }

    @Transactional
    public ShelfItem add(long userId, long productId, ShelfUsageStatus usageStatus, Rating rating) {
        shelfProductRepository.lockShelf(userId);
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new InvalidRequestException(ErrorCode.INVALID_REQUEST_BODY));
        rating.validateFor(product);
        if (!shelfProductRepository.add(userId, productId, usageStatus, rating)) {
            throw new ShelfProductAlreadyExistsException();
        }
        recordRating(userId, productId, usageStatus, rating);
        return refreshAnalysis(userId).item(productId);
    }

    @Transactional
    public ShelfItem update(long userId, long productId, ShelfUsageStatus usageStatus, Rating rating) {
        shelfProductRepository.lockShelf(userId);
        ShelfProduct shelfProduct = shelfProductRepository.find(userId, productId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.SHELF_PRODUCT_NOT_FOUND));
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.SHELF_PRODUCT_NOT_FOUND));
        rating.validateFor(product);
        shelfProductRepository.update(userId, productId, usageStatus, rating);
        recordRating(userId, productId, usageStatus, rating);
        if (shelfProduct.changesPreferenceTo(rating)) {
            return refreshAnalysis(userId).item(productId);
        }
        return findShelf(userId).item(productId);
    }

    @Transactional
    public void remove(long userId, long productId) {
        shelfProductRepository.lockShelf(userId);
        if (shelfProductRepository.delete(userId, productId)) {
            refreshAnalysis(userId);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void refreshAnalysisForSkinChange(long userId) {
        shelfProductRepository.lockShelf(userId);
        refreshAnalysis(userId);
    }

    @Transactional(readOnly = true)
    public IngredientAnalysis analyzeIngredients(long userId) {
        ExcludeCodes excludeCodes = excludeCodeRepository.findAll();
        return IngredientAnalysis.of(
            findShelf(userId, excludeCodes),
            shelfAnalysisRepository.find(userId),
            skinFilterRepository.findIngredientIds(userId),
            excludeCodes
        );
    }

    // 제품을 담거나 빼거나 호불호나 피부 정보가 바뀐 트랜잭션에서 결과를 다시 계산해 새 성분을 다시 표시한다.
    private Shelf refreshAnalysis(long userId) {
        Shelf shelf = findShelf(userId);
        AnalysisSnapshot snapshot = shelfAnalysisRepository.find(userId);
        shelfAnalysisRepository.save(userId, snapshot.next(shelf.suspectIngredients().ingredientIds()));
        return shelf;
    }

    // 담기·수정을 저장한 트랜잭션에서 평가한 순간의 프로필과 함께 이력을 남긴다. 회원 행을 잠근 뒤라 프로필 변경과 겹치지 않는다.
    private void recordRating(long userId, long productId, ShelfUsageStatus usageStatus, Rating rating) {
        ShelfRatingRecord record = new ShelfRatingRecord(
            usageStatus,
            rating,
            RaterProfile.of(findUser(userId)),
            LocalDate.ofInstant(clock.instant(), SEOUL)
        );
        ShelfRatingHistory history = shelfRatingHistoryRepository.findCurrent(userId, productId);
        if (history.needsRecord(record)) {
            shelfRatingHistoryRepository.supersede(history.supersededBy(record));
            shelfRatingHistoryRepository.add(userId, productId, record);
        }
    }

    private SuspectCandidates candidatesOf(long userId, ExcludeCodes excludeCodes) {
        User user = findUser(userId);
        SkinCautions cautions = SkinCautions.of(user.skinType(), user.sensitiveSkin());
        return new SuspectCandidates(
            excludeCodes.ingredientIds(),
            cautions.ingredientIdsWith(shelfCautionRepository.findGroupIngredientIds(cautions.ingredientGroupCodes()))
        );
    }

    private User findUser(long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND));
    }
}
