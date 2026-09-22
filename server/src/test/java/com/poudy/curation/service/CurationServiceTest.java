package com.poudy.curation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationBlock;
import com.poudy.curation.domain.CurationBlockContent;
import com.poudy.curation.domain.CurationPublicationStatus;
import com.poudy.curation.domain.Curations;
import com.poudy.curation.domain.ResolvedCurationDetail;
import com.poudy.curation.repository.CurationRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CurationServiceTest {

    @Test
    void usesCurrentProductCatalogOnEveryRead() {
        CurationBlock block = CurationBlock.products(
            UUID.randomUUID(),
            0,
            0,
            List.of(15L)
        );
        Curation curation = curation(12L, "상세", List.of(block));
        CurationRepository repository = mock(CurationRepository.class);
        given(repository.findAll()).willReturn(Curations.from(List.of(curation)));
        ProductRepository products = mock(ProductRepository.class);
        Product current = mock(Product.class);
        given(current.id()).willReturn(15L);
        Products currentCatalog = Products.from(List.of(current));
        given(products.findAll()).willReturn(Products.from(List.of()), currentCatalog);
        CurationService service = new CurationService(repository, products);

        assertThat(service.findCurations()).containsExactly(curation);
        ResolvedCurationDetail first = service.findDetail(12L);
        assertThat(first.curation().title()).isEqualTo("상세");
        assertThat(first.blocks()).isEmpty();
        CurationBlockContent.Products productsBlock = (CurationBlockContent.Products) service.findDetail(12L)
            .blocks().getFirst();
        assertThat(productsBlock.products().getFirst()).isSameAs(current);
    }

    @Test
    void rejectsUnavailableCuration() {
        CurationRepository repository = mock(CurationRepository.class);
        given(repository.findAll()).willReturn(Curations.from(List.of()));
        CurationService service = new CurationService(repository, mock(ProductRepository.class));

        assertThatThrownBy(() -> service.findDetail(999L)).isInstanceOf(ResourceNotFoundException.class)
            .extracting(exception -> ((ResourceNotFoundException) exception).code())
            .isEqualTo(ErrorCode.CURATION_NOT_FOUND);
    }

    @Test
    void appliesCurationPublicationAndBannerVisibility() {
        Curation published = curation(
            12L,
            "게시 및 배너 노출",
            List.of(),
            CurationPublicationStatus.PUBLISHED,
            true
        );
        Curation hiddenBanner = curation(
            4L,
            "게시 및 배너 비노출",
            List.of(),
            CurationPublicationStatus.PUBLISHED,
            false
        );
        Curation unpublished = curation(
            20L,
            "미게시",
            List.of(),
            CurationPublicationStatus.UNPUBLISHED,
            false
        );
        CurationRepository repository = mock(CurationRepository.class);
        given(repository.findAll()).willReturn(Curations.from(List.of(published, hiddenBanner, unpublished)));
        ProductRepository products = mock(ProductRepository.class);
        given(products.findAll()).willReturn(Products.from(List.of()));
        CurationService service = new CurationService(repository, products);

        assertThat(service.findCurations()).containsExactly(published);
        assertThat(service.findDetail(4L).curation()).isSameAs(hiddenBanner);
        assertThatThrownBy(() -> service.findDetail(20L)).isInstanceOf(ResourceNotFoundException.class);
    }

    private static Curation curation(Long id, String title, List<CurationBlock> blocks) {
        return curation(
            id,
            title,
            blocks,
            CurationPublicationStatus.PUBLISHED,
            true
        );
    }

    private static Curation curation(
        Long id,
        String title,
        List<CurationBlock> blocks,
        CurationPublicationStatus publicationStatus,
        boolean bannerVisible
    ) {
        return new Curation(
            id,
            title,
            "설명",
            publicationStatus,
            bannerVisible,
            bannerVisible ? "banner.png" : null,
            blocks
        );
    }
}
