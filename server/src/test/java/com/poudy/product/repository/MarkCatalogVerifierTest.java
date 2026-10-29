package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class MarkCatalogVerifierTest {
    @Autowired
    private MarkCatalogVerifier verifier;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void rejectsMissingCatalogCodes() {
        jdbc.update("delete from mark where code = 'WATERPROOF'");

        assertThatThrownBy(() -> verifier.run(new DefaultApplicationArguments()))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void doesNotBlockStartupForInvalidProductAssignments() {
        jdbc.update("update product set category_id = 2 where id = 1");
        jdbc.update("insert into product_mark(product_id, mark_code) values (1, 'ORGANIC'), (1, 'MINERAL')");

        assertThatCode(() -> verifier.run(new DefaultApplicationArguments())).doesNotThrowAnyException();
    }

}
