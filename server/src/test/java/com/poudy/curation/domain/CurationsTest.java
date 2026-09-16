package com.poudy.curation.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class CurationsTest {

    @Test
    void preservesBannerOrder() {
        Curation high = curation(12L);
        List<Curation> source = new ArrayList<>(
            List.of(
                high,
                curation(4L)
            )
        );
        Curations curations = Curations.from(source);
        source.clear();

        assertThat(curations.inOrder()).extracting(Curation::id).containsExactly(12L, 4L);
        assertThat(curations.findById(12L)).containsSame(high);
        assertThat(curations.findById(999L)).isEmpty();
        assertThat(Curations.from(List.of()).inOrder()).isEmpty();
    }

    @Test
    void rejectsDuplicateCurationIds() {
        assertThatThrownBy(() -> Curations.from(List.of(curation(12L), curation(12L))))
            .isInstanceOf(IllegalArgumentException.class);
    }

    private static Curation curation(Long id) {
        return CurationTest.curation(id, List.of());
    }
}
