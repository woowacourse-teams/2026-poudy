package com.poudy.curation.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.common.json.JsonDataReader;
import com.poudy.curation.domain.Curation;
import com.poudy.exception.InfrastructureException;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;

@SpringBootTest
@DisplayName("큐레이션 저장소")
class CurationRepositoryTest {

    @Autowired
    private CurationRepository curationRepository;

    @Test
    @DisplayName("카테고리와 제품 참조를 순서대로 해석한다")
    void resolvesReferencesKeepingOrder() {
        Curation curation = curationRepository.findAll().findPublishedById(12L).orElseThrow();

        assertThat(curation.categories()).extracting(Category::id).containsExactly(13L, 1L);
        assertThat(curation.products(null)).extracting(Product::id).containsExactly(15L, 10L, 7L, 1L);
        assertThat(curation.imageUrls()).containsExactly(
            "https://cdn.example.com/curations/12/main.png",
            "https://cdn.example.com/curations/12/description-1.png"
        );
    }

    @Test
    @DisplayName("존재하지 않는 카테고리나 제품 참조는 데이터 오류로 처리한다")
    void rejectsUnknownReferences() {
        assertThatThrownBy(() -> repositoryReading("[999]", "[1]", "PUBLISHED"))
            .isInstanceOf(InfrastructureException.class);
        assertThatThrownBy(() -> repositoryReading("[1]", "[999]", "PUBLISHED"))
            .isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("지원하지 않는 상태는 데이터 오류로 처리한다")
    void rejectsUnknownStatus() {
        assertThatThrownBy(() -> repositoryReading("[1]", "[1]", "UNKNOWN"))
            .isInstanceOf(InfrastructureException.class);
    }

    private static CurationRepository repositoryReading(String categoryIds, String productIds, String status) {
        String curationData = """
            {"curations":[{
              "id":12,
              "title":"제목",
              "summary":"간단 설명",
              "description":"상세 설명",
              "image_urls":["https://example.com/main.png"],
              "category_ids":%s,
              "product_ids":%s,
              "status":"%s"
            }]}
            """.formatted(categoryIds, productIds, status);
        DefaultResourceLoader resourceLoader = new DefaultResourceLoader() {

            @Override
            public Resource getResource(String location) {
                return new ByteArrayResource(curationData.getBytes(StandardCharsets.UTF_8));
            }
        };

        Product product = mock(Product.class);
        given(product.id()).willReturn(1L);
        Products products = Products.from(List.of(product));
        ProductRepository productRepository = mock(ProductRepository.class);
        given(productRepository.findAll()).willReturn(products);

        return new CurationRepository(
            new JsonDataReader(resourceLoader),
            Categories.from(List.of(new Category(1L, null, "스킨케어", 0))),
            productRepository
        );
    }
}
