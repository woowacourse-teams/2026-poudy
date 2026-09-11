package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import com.poudy.brand.domain.Brands;
import com.poudy.brand.repository.BrandRepository;
import com.poudy.category.domain.Categories;
import com.poudy.category.repository.CategoryRepository;
import com.poudy.common.json.JsonDataReader;
import com.poudy.ingredient.domain.IngredientCatalog;
import com.poudy.ingredient.repository.IngredientRepository;
import com.poudy.product.domain.ProductFactory;
import com.poudy.product.domain.ProductFilter;
import com.poudy.product.domain.Products;
import com.poudy.product.domain.sensory.HeuristicProductSensoryEstimator;
import com.poudy.product.repository.ProductRepository;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.tag.domain.Tags;
import com.poudy.tag.repository.TagRepository;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

class CatalogKeywordSearchTest {

    @Test
    void usesExistingProductSearchWithBrandIntentWithoutRereadingCatalogs() {
        JsonDataReader reader = spy(new JsonDataReader(new DefaultResourceLoader()));
        Brands brands = new BrandRepository(reader).findAll();
        Categories categories = new CategoryRepository(reader).findAll();
        Tags tags = new TagRepository(reader).findAll();
        IngredientCatalog ingredients = new IngredientRepository(reader, tags).findAll();
        ProductRepository repository = spy(
            new ProductRepository(
                reader,
                brands,
                categories,
                ingredients,
                new ProductFactory(new HeuristicProductSensoryEstimator())
            )
        );
        Products products = repository.findAll();
        clearInvocations(reader, repository);
        doReturn(products).when(repository).findAll();
        CatalogKeywordSearch search = new CatalogKeywordSearch(repository);

        for (String keyword : java.util.List.of(
            "다 브랜드 블랙 스네일 토너",
            "가 브랜드 블랙 스네일 토너",
            "다 브랜드",
            "토너",
            "ㅌㄴ",
            "toner",
            "없는상품"
        )) {
            boolean expected = products.find(
                new ProductFilter(new SearchKeyword(keyword), null, null, null, null, null),
                null,
                0,
                1,
                categories
            ).totalElements() > 0;
            assertThat(search.hasResults(keyword)).as(keyword).isEqualTo(expected);
        }

        verify(repository).findAll();
        verifyNoMoreInteractions(repository, reader);
    }
}
