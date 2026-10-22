package com.poudy.curation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationBlock;
import com.poudy.curation.domain.CurationBlockContent;
import com.poudy.curation.domain.CurationProductLinkQuery;
import com.poudy.curation.domain.CurationPublicationStatus;
import com.poudy.curation.domain.ResolvedCurationDetail;
import com.poudy.curation.repository.CurationProductLinkRepository;
import com.poudy.curation.repository.CurationRepository;
import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

class CurationServiceTest {

    @Test
    void propagatesReferenceDatabaseFailureInsteadOfTreatingItAsMissingData() {
        CurationBlock block = CurationBlock.productLink(
            UUID.randomUUID(),
            0,
            0,
            "제품 보러가기",
            new CurationProductLinkQuery(null, List.of(1L), List.of(), List.of(), List.of())
        );
        Curation curation = curation(12L, "상세", List.of(block));
        CurationRepository repository = mock(CurationRepository.class);
        given(repository.findPublishedById(12L)).willReturn(java.util.Optional.of(curation));
        ProductRepository products = mock(ProductRepository.class);
        given(products.findAllById(List.of())).willReturn(List.of());
        CurationProductLinkRepository references = mock(CurationProductLinkRepository.class);
        given(references.findInvalidBlockIds(org.mockito.ArgumentMatchers.anyList()))
            .willThrow(new DataAccessResourceFailureException("DB unavailable"));

        assertThatThrownBy(() -> new CurationService(repository, products, references).findDetail(12L))
            .isInstanceOf(DataAccessResourceFailureException.class);
    }

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
        given(repository.findPublishedById(12L)).willReturn(java.util.Optional.of(curation));
        ProductRepository products = mock(ProductRepository.class);
        Product current = mock(Product.class);
        given(current.id()).willReturn(15L);
        given(products.findAllById(List.of(15L))).willReturn(List.of(), List.of(current));
        CurationService service = new CurationService(repository, products, mock(CurationProductLinkRepository.class));

        ResolvedCurationDetail first = service.findDetail(12L);
        assertThat(first.curation().title()).isEqualTo("상세");
        assertThat(first.blocks()).isEmpty();
        CurationBlockContent.Products productsBlock = (CurationBlockContent.Products) service.findDetail(12L)
            .blocks().getFirst();
        assertThat(productsBlock.products().getFirst()).isSameAs(current);
    }

    private static Curation curation(Long id, String title, List<CurationBlock> blocks) {
        return new Curation(
            id,
            title,
            "설명",
            CurationPublicationStatus.PUBLISHED,
            blocks
        );
    }
}
