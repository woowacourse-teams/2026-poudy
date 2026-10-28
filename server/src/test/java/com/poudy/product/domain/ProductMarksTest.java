package com.poudy.product.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ProductMarksTest {
    @Test
    void rejectsDuplicateMarks() {
        assertThatThrownBy(() -> new ProductMarks("선케어", List.of(Mark.EASY_WASH, Mark.EASY_WASH)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @CsvSource({"MINERAL, ORGANIC", "MINERAL, HYBRID", "ORGANIC, HYBRID"})
    void rejectsEveryPairOfUvFilterTypes(Mark first, Mark second) {
        assertThatThrownBy(() -> new ProductMarks("선케어", List.of(first, second)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void addsMarksWithoutSharingOrMutatingTheInput() {
        List<Mark> current = new ArrayList<>(List.of(Mark.MINERAL));
        ProductMarks changed = ProductMarks.adding("선케어", current, Mark.EASY_WASH);
        assertThat(current).containsExactly(Mark.MINERAL);
        current.clear();
        assertThat(changed.codes()).containsExactly("MINERAL", "EASY_WASH");
    }
}
