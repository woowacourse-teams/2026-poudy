package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.product.domain.Mark;
import com.poudy.product.domain.ProductMarks;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class ProductMarkWriterTest {
    @Autowired
    private ProductMarkWriter writer;
    @Autowired
    private JdbcTemplate jdbc;

    private LocalDateTime originalUpdatedAt;

    @BeforeEach
    void setUp() {
        originalUpdatedAt = jdbc.queryForObject("select updated_at from product where id = 1", LocalDateTime.class);
        reset();
    }

    @AfterEach
    void cleanUp() {
        reset();
        jdbc.update("update product set updated_at = ? where id = 1", originalUpdatedAt);
    }

    private void reset() {
        jdbc.update("delete from product_mark where product_id = 1");
        jdbc.update("update product set category_id = 2 where id = 1");
    }

    @Test
    void acceptsDaisoEverywhereAndOtherMarksOnlyInSunCare() {
        writer.replace(1, List.of(Mark.DAISO));
        assertThatThrownBy(() -> writer.add(1, Mark.MINERAL)).isInstanceOf(IllegalArgumentException.class);
        assertThat(marks()).containsExactly(Mark.DAISO);
        writer.replace(1, 14, List.of(Mark.MINERAL, Mark.EASY_WASH, Mark.WATERPROOF, Mark.DAISO));
        assertThat(marks()).containsExactlyInAnyOrder(Mark.MINERAL, Mark.EASY_WASH, Mark.WATERPROOF, Mark.DAISO);
    }

    @Test
    void validatesTheFinalCategoryAndMarksAtomically() {
        writer.replace(1, 14, List.of(Mark.MINERAL));
        assertThatThrownBy(() -> writer.changeCategory(1, 2)).isInstanceOf(IllegalArgumentException.class);
        assertThat(jdbc.queryForObject("select category_id from product where id = 1", Long.class)).isEqualTo(14);
        assertThatThrownBy(() -> writer.replace(1, List.of(Mark.MINERAL, Mark.ORGANIC)))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(marks()).containsExactly(Mark.MINERAL);
        writer.replace(1, 2, List.of(Mark.DAISO));
        assertThat(marks()).containsExactly(Mark.DAISO);
    }

    @Test
    void serializesCompetingUltravioletMarks() throws Exception {
        writer.replace(1, 14, List.of());
        List<Boolean> results = race(() -> writer.add(1, Mark.MINERAL), () -> writer.add(1, Mark.ORGANIC));
        assertThat(results).containsExactlyInAnyOrder(true, false);
        assertThat(marks()).hasSize(1);
    }

    @Test
    void serializesCategoryChangeAgainstMarkAssignment() throws Exception {
        writer.replace(1, 14, List.of());
        List<Boolean> results = race(() -> writer.add(1, Mark.MINERAL), () -> writer.changeCategory(1, 2));
        assertThat(results).containsExactlyInAnyOrder(true, false);
        String root = jdbc.queryForObject("""
            select root.name from product p join category child on child.id = p.category_id
            join category root on root.id = child.parent_id where p.id = 1
            """, String.class);
        new ProductMarks(root, marks());
    }

    private List<Mark> marks() {
        return jdbc.queryForList("select mark_code from product_mark where product_id = 1", String.class)
            .stream().map(Mark::fromCode).toList();
    }

    private List<Boolean> race(Runnable first, Runnable second) throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            Future<Boolean> left = executor.submit(task(start, first));
            Future<Boolean> right = executor.submit(task(start, second));
            start.countDown();
            return List.of(left.get(10, TimeUnit.SECONDS), right.get(10, TimeUnit.SECONDS));
        }
    }

    private Callable<Boolean> task(CountDownLatch start, Runnable work) {
        return () -> {
            start.await(10, TimeUnit.SECONDS);
            try {
                work.run();
                return true;
            } catch (IllegalArgumentException exception) {
                return false;
            }
        };
    }
}
