package com.poudy.shelf.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.product.repository.ProductRepository;
import com.poudy.shelf.domain.AnalysisSnapshot;
import com.poudy.shelf.domain.IngredientAnalysis;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.Shelf;
import com.poudy.shelf.domain.ShelfItem;
import com.poudy.shelf.domain.ShelfProduct;
import com.poudy.shelf.domain.ShelfProductAlreadyExistsException;
import com.poudy.shelf.domain.ShelfUsageStatus;
import com.poudy.shelf.domain.SkinCautions;
import com.poudy.shelf.domain.SuspectCandidates;
import com.poudy.shelf.repository.ShelfAnalysisRepository;
import com.poudy.shelf.repository.ShelfCautionRepository;
import com.poudy.shelf.repository.ShelfProductRepository;
import com.poudy.skinfilter.repository.SkinFilterRepository;
import com.poudy.user.domain.User;
import com.poudy.user.repository.UserRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ShelfService {

    private final ShelfProductRepository shelfProductRepository;
    private final ShelfCautionRepository shelfCautionRepository;
    private final ShelfAnalysisRepository shelfAnalysisRepository;
    private final ProductRepository productRepository;
    private final SkinFilterRepository skinFilterRepository;
    private final ExcludeCodeRepository excludeCodeRepository;
    private final UserRepository userRepository;

    public ShelfService(
        ShelfProductRepository shelfProductRepository,
        ShelfCautionRepository shelfCautionRepository,
        ShelfAnalysisRepository shelfAnalysisRepository,
        ProductRepository productRepository,
        SkinFilterRepository skinFilterRepository,
        ExcludeCodeRepository excludeCodeRepository,
        UserRepository userRepository
    ) {
        this.shelfProductRepository = shelfProductRepository;
        this.shelfCautionRepository = shelfCautionRepository;
        this.shelfAnalysisRepository = shelfAnalysisRepository;
        this.productRepository = productRepository;
        this.skinFilterRepository = skinFilterRepository;
        this.excludeCodeRepository = excludeCodeRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Shelf findShelf(long userId) {
        List<ShelfProduct> shelfProducts = shelfProductRepository.findAll(userId);
        List<Long> productIds = shelfProducts.stream()
            .map(ShelfProduct::productId)
            .toList();
        return Shelf.of(shelfProducts, productRepository.findAllById(productIds), candidatesOf(userId));
    }

    public List<Long> findProductIds(long userId) {
        return shelfProductRepository.findProductIds(userId);
    }

    @Transactional
    public ShelfItem add(long userId, long productId, ShelfUsageStatus usageStatus, Rating rating) {
        shelfProductRepository.lockShelf(userId);
        if (productRepository.findById(productId).isEmpty()) {
            throw new InvalidRequestException(ErrorCode.INVALID_REQUEST_BODY);
        }
        if (!shelfProductRepository.add(userId, productId, usageStatus, rating)) {
            throw new ShelfProductAlreadyExistsException();
        }
        return refreshAnalysis(userId).item(productId);
    }

    @Transactional
    public ShelfItem update(long userId, long productId, ShelfUsageStatus usageStatus, Rating rating) {
        shelfProductRepository.lockShelf(userId);
        ShelfProduct shelfProduct = shelfProductRepository.find(userId, productId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.SHELF_PRODUCT_NOT_FOUND));
        shelfProductRepository.update(userId, productId, usageStatus, rating);
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

    @Transactional(readOnly = true)
    public IngredientAnalysis analyzeIngredients(long userId) {
        return IngredientAnalysis.of(
            findShelf(userId),
            shelfAnalysisRepository.find(userId),
            skinFilterRepository.findIngredientIds(userId)
        );
    }

    // 제품을 담거나 빼거나 호불호가 바뀐 같은 트랜잭션에서 결과를 다시 계산해 새 성분을 다시 표시한다.
    private Shelf refreshAnalysis(long userId) {
        Shelf shelf = findShelf(userId);
        AnalysisSnapshot snapshot = shelfAnalysisRepository.find(userId);
        shelfAnalysisRepository.save(userId, snapshot.next(shelf.suspectIngredients().ingredientIds()));
        return shelf;
    }

    private SuspectCandidates candidatesOf(long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND));
        SkinCautions cautions = SkinCautions.of(user.skinType(), user.sensitiveSkin());
        return new SuspectCandidates(
            excludeCodeRepository.findAll().ingredientIds(),
            cautions.ingredientIdsWith(shelfCautionRepository.findGroupIngredientIds(cautions.ingredientGroupCodes()))
        );
    }
}
