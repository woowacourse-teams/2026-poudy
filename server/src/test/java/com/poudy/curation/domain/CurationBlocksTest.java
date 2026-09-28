package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.product.domain.Products;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CurationBlocksTest {

    @Test
    void rejectsDuplicateBlockIds() {
        UUID id = UUID.randomUUID();
        CurationBlock first = CurationBlock.image(id, 0, 0, "first.png");
        CurationBlock second = CurationBlock.image(id, 0, 0, "second.png");

        assertThatThrownBy(() -> CurationBlocks.from(List.of(first, second)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void resolvesContentInSavedOrderWithoutDependingOnTheSourceList() {
        UUID firstId = UUID.randomUUID();
        UUID secondId = UUID.randomUUID();
        List<CurationBlock> source = new ArrayList<>(
            List.of(
                CurationBlock.image(firstId, 0, 0, "first.png"),
                CurationBlock.image(secondId, 0, 0, "second.png")
            )
        );
        CurationBlocks blocks = CurationBlocks.from(source);
        source.clear();

        assertThat(blocks.resolveContent(Products.from(List.of())))
            .extracting(CurationBlockContent::id)
            .containsExactly(firstId, secondId);
    }
}
