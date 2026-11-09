package com.poudy.product.domain;

import java.util.List;

public interface ProductYouTubeRecommendations {
    List<ProductYouTubeRecommendation> findFor(long productId);
}
