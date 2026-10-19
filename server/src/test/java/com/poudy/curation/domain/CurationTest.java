package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CurationTest {
    @Test
    void rejectsBlankPublicText() {
        assertThatThrownBy(() -> new Curation(12L, " ", "설명", CurationPublicationStatus.PUBLISHED, List.of()))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new Curation(12L, "제목", " ", CurationPublicationStatus.PUBLISHED, List.of()))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CurationFilter(UUID.randomUUID(), " "))
            .isInstanceOf(IllegalArgumentException.class);
    }

}
