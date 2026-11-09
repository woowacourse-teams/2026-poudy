package com.poudy.youtube.service;

import com.poudy.product.domain.ProductYouTubeRecommendation;
import com.poudy.product.domain.ProductYouTubeRecommendations;
import com.poudy.youtube.repository.YouTubeProductRecommendationRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class YouTubeProductRecommendations implements ProductYouTubeRecommendations {
    private final YouTubeProductRecommendationRepository repository;

    public YouTubeProductRecommendations(YouTubeProductRecommendationRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true, propagation = Propagation.NESTED)
    public List<ProductYouTubeRecommendation> findFor(long productId) {
        return repository.findFor(productId);
    }
}
