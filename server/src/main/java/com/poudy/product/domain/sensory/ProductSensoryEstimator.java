package com.poudy.product.domain.sensory;

import com.poudy.category.domain.Category;
import com.poudy.ingredient.domain.Ingredients;

public interface ProductSensoryEstimator {

    ProductSensory estimate(Category category, Ingredients ingredients);

    SensoryModelVersion modelVersion();
}
