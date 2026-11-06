package com.poudy.shelf.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.myfilter.repository.MyFilterRepository;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import com.poudy.shelf.domain.AnalysisSnapshot;
import com.poudy.shelf.domain.GuestIngredientAnalysis;
import com.poudy.shelf.domain.GuestRating;
import com.poudy.shelf.domain.GuestRatings;
import com.poudy.shelf.domain.GuestShelfProducts;
import com.poudy.shelf.domain.IngredientAnalysis;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.RatingPreference;
import com.poudy.shelf.domain.Shelf;
import com.poudy.shelf.domain.ShelfItem;
import com.poudy.shelf.domain.ShelfProduct;
import com.poudy.shelf.domain.ShelfProductAlreadyExistsException;
import com.poudy.shelf.domain.ShelfRatingPreview;
import com.poudy.shelf.domain.ShelfUsageStatus;
import com.poudy.shelf.domain.SkinCautions;
import com.poudy.shelf.domain.SuspectCandidates;
import com.poudy.shelf.repository.ShelfAnalysisRepository;
import com.poudy.shelf.repository.ShelfCautionRepository;
import com.poudy.shelf.repository.ShelfProductRepository;
import com.poudy.user.domain.User;
import com.poudy.user.repository.UserRepository;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShelfService {

    private static final Logger log = LoggerFactory.getLogger(ShelfService.class);

    private final ShelfProductRepository shelfProductRepository;
    private final ShelfCautionRepository shelfCautionRepository;
    private final ShelfAnalysisRepository shelfAnalysisRepository;
    private final ProductRepository productRepository;
    private final MyFilterRepository myFilterRepository;
    private final ExcludeCodeRepository excludeCodeRepository;
    private final UserRepository userRepository;
    private final ShelfRatingHistoryService shelfRatingHistoryService;

    public ShelfService(
        ShelfProductRepository shelfProductRepository,
        ShelfCautionRepository shelfCautionRepository,
        ShelfAnalysisRepository shelfAnalysisRepository,
        ProductRepository productRepository,
        MyFilterRepository myFilterRepository,
        ExcludeCodeRepository excludeCodeRepository,
        UserRepository userRepository,
        ShelfRatingHistoryService shelfRatingHistoryService
    ) {
        this.shelfProductRepository = shelfProductRepository;
        this.shelfCautionRepository = shelfCautionRepository;
        this.shelfAnalysisRepository = shelfAnalysisRepository;
        this.productRepository = productRepository;
        this.myFilterRepository = myFilterRepository;
        this.excludeCodeRepository = excludeCodeRepository;
        this.userRepository = userRepository;
        this.shelfRatingHistoryService = shelfRatingHistoryService;
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

    @Transactional
    public void restore(long userId, long productId) {
        shelfProductRepository.lockShelf(userId);
        if (shelfProductRepository.restore(userId, productId)) {
            refreshAnalysis(userId);
            return;
        }
        if (shelfProductRepository.find(userId, productId).isEmpty()) {
            throw new ResourceNotFoundException(ErrorCode.SHELF_PRODUCT_NOT_FOUND);
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
        Shelf shelf = findShelf(userId, excludeCodes);
        return shelf.analyze(
            shelfAnalysisRepository.find(userId),
            myFilterRepository.findIngredientIds(userId),
            excludeCodes
        );
    }

    @Transactional(readOnly = true)
    public GuestIngredientAnalysis analyzeGuestIngredients(List<GuestRating> ratings) {
        GuestRatings guestRatings = GuestRatings.of(ratings);
        List<Product> catalogProducts = catalogProductsOf(guestRatings.productIds());
        ExcludeCodes excludeCodes = excludeCodeRepository.findAll();
        return guestRatings.analyze(catalogProducts, candidatesOf(SkinCautions.all(), excludeCodes), excludeCodes);
    }

    @Transactional(readOnly = true)
    public ShelfRatingPreview previewRating(long userId, long productId) {
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND));
        User user = findUser(userId);
        ExcludeCodes excludeCodes = excludeCodeRepository.findAll();
        List<ShelfProduct> shelfProducts = shelfProductRepository.findAll(userId);
        List<Product> products = productRepository.findAllById(productIdsWith(shelfProducts, productId));
        AnalysisSnapshot snapshot = shelfAnalysisRepository.find(userId);
        List<Long> filterIngredientIds = myFilterRepository.findIngredientIds(userId);
        SuspectCandidates candidates = candidatesOf(
            SkinCautions.of(user.skinType(), user.sensitiveSkin()),
            excludeCodes
        );
        Function<RatingPreference, IngredientAnalysis> analyze = preference -> Shelf.analyzeAssuming(
            shelfProducts,
            productId,
            preference,
            products,
            candidates,
            snapshot,
            filterIngredientIds,
            excludeCodes
        );
        if (user.hasSkinType()) {
            return new ShelfRatingPreview(
                analyze.apply(null),
                analyze.apply(RatingPreference.GOOD),
                analyze.apply(RatingPreference.BAD),
                null,
                candidates.ingredientsIn(product)
            );
        }
        SuspectCandidates allCandidates = candidatesOf(SkinCautions.all(), excludeCodes);
        return new ShelfRatingPreview(
            analyze.apply(null),
            analyze.apply(RatingPreference.GOOD),
            analyze.apply(RatingPreference.BAD),
            Shelf.analyzeAssuming(
                shelfProducts,
                productId,
                RatingPreference.BAD,
                products,
                allCandidates,
                snapshot,
                filterIngredientIds,
                excludeCodes
            ),
            allCandidates.ingredientsIn(product)
        );
    }

    @Transactional(readOnly = true)
    public ShelfRatingPreview previewGuestRating(List<GuestRating> ratings, long productId) {
        GuestRatings guestRatings = GuestRatings.of(ratings);
        List<Product> catalogProducts = catalogProductsOf(guestRatings.assuming(productId, null).productIds());
        Product product = Products.from(catalogProducts).findById(productId)
            .orElseThrow(() -> new InvalidRequestException(ErrorCode.INVALID_REQUEST_BODY));
        ExcludeCodes excludeCodes = excludeCodeRepository.findAll();
        SuspectCandidates candidates = candidatesOf(SkinCautions.all(), excludeCodes);
        Function<RatingPreference, IngredientAnalysis> analyze = preference -> guestRatings
            .assuming(productId, preference)
            .analyze(catalogProducts, candidates, excludeCodes)
            .analysis();
        return new ShelfRatingPreview(
            analyze.apply(null),
            analyze.apply(RatingPreference.GOOD),
            analyze.apply(RatingPreference.BAD),
            null,
            candidates.ingredientsIn(product)
        );
    }

    @Transactional
    public void importGuestShelf(long userId, List<ShelfProduct> shelfProducts) {
        shelfProductRepository.lockShelf(userId);
        GuestShelfProducts guestShelfProducts = GuestShelfProducts.of(shelfProducts);
        guestShelfProducts.validateRatingsFor(catalogProductsOf(guestShelfProducts.productIds()));
        List<ShelfProduct> importedProducts = guestShelfProducts.items().stream()
            .filter(shelfProduct -> shelfProductRepository.addRegistered(userId, shelfProduct))
            .toList();
        if (importedProducts.isEmpty()) {
            return;
        }
        importedProducts.forEach(
            shelfProduct -> recordRating(
                userId,
                shelfProduct.productId(),
                shelfProduct.usageStatus(),
                shelfProduct.rating()
            )
        );
        refreshAnalysis(userId);
    }

    private List<Product> catalogProductsOf(List<Long> productIds) {
        List<Product> catalogProducts = productRepository.findAllById(productIds);
        if (catalogProducts.size() != productIds.size()) {
            throw new InvalidRequestException(ErrorCode.INVALID_REQUEST_BODY);
        }
        return catalogProducts;
    }

    // 제품을 담거나 빼거나 호불호나 피부 정보가 바뀐 트랜잭션에서 결과를 다시 계산해 새 성분을 다시 표시한다.
    private Shelf refreshAnalysis(long userId) {
        Shelf shelf = findShelf(userId);
        AnalysisSnapshot snapshot = shelfAnalysisRepository.find(userId);
        shelfAnalysisRepository.save(userId, shelf.nextAnalysisSnapshot(snapshot));
        return shelf;
    }

    // 이력은 분석용이라 남기지 못해도 사용자의 평가는 저장한다. 이력 쓰기는 세이브포인트까지만 되돌리고 오류 로그로 알린다.
    private void recordRating(long userId, long productId, ShelfUsageStatus usageStatus, Rating rating) {
        try {
            shelfRatingHistoryService.record(userId, productId, usageStatus, rating);
        } catch (RuntimeException exception) {
            log.error(
                "Shelf rating was stored but its history was not recorded: userId={}, productId={}",
                userId,
                productId,
                exception
            );
        }
    }

    private SuspectCandidates candidatesOf(long userId, ExcludeCodes excludeCodes) {
        User user = findUser(userId);
        return candidatesOf(SkinCautions.of(user.skinType(), user.sensitiveSkin()), excludeCodes);
    }

    private User findUser(long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND));
    }

    private List<Long> productIdsWith(List<ShelfProduct> shelfProducts, long productId) {
        return Stream.concat(shelfProducts.stream().map(ShelfProduct::productId), Stream.of(productId))
            .distinct()
            .toList();
    }

    private SuspectCandidates candidatesOf(SkinCautions cautions, ExcludeCodes excludeCodes) {
        return cautions.candidatesWith(
            excludeCodes.ingredientIds(),
            shelfCautionRepository.findIngredientIdsByGroup(cautions.ingredientGroupCodes())
        );
    }
}
