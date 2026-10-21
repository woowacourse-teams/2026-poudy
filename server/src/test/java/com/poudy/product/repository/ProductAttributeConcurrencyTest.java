package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
class ProductAttributeConcurrencyTest {

    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void rejectsUnprotectedCatalogWrites() {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        assertThatThrownBy(() -> transaction.executeWithoutResult(status -> jdbc.update("""
            insert into category_attribute(category_id, attribute_id)
            select 1, id from attribute where code = 'WASHABILITY'
            """))).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void concurrentMappingRemovalAndAssignmentCannotBothCommit() throws Exception {
        TransactionTemplate transaction = serializable();
        transaction.executeWithoutResult(status -> jdbc.update("""
            insert into category_attribute(category_id, attribute_id)
            select 1, id from attribute where code = 'WASHABILITY'
            """));
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch commit = new CountDownLatch(1);
        try (var workers = Executors.newFixedThreadPool(2)) {
            var removal = workers.submit(writeThenCommit("""
                delete from category_attribute where category_id = 1
                    and attribute_id = (select id from attribute where code = 'WASHABILITY')
                """, ready, commit));
            var assignment = workers.submit(writeThenCommit("""
                insert into product_attribute_value(product_id, attribute_id, value_code)
                select 1, id, 'EASY_WASH' from attribute where code = 'WASHABILITY'
                """, ready, commit));
            try {
                assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            } finally {
                commit.countDown();
            }
            boolean removed = removal.get(20, TimeUnit.SECONDS);
            boolean assigned = assignment.get(20, TimeUnit.SECONDS);
            assertThat(removed && assigned).isFalse();
            assertThat(removed || assigned).isTrue();
            assertThat(jdbc.queryForObject("""
                select count(*) from product_attribute_value pav join product p on p.id = pav.product_id
                join category c on c.id = p.category_id
                left join category_attribute ca on ca.category_id = c.parent_id and ca.attribute_id = pav.attribute_id
                where ca.attribute_id is null
                """, Long.class)).isZero();
        } finally {
            transaction.executeWithoutResult(status -> {
                jdbc.update("delete from product_attribute_value where product_id = 1");
                jdbc.update("delete from category_attribute where category_id = 1");
            });
        }
    }

    private Callable<Boolean> writeThenCommit(String sql, CountDownLatch ready, CountDownLatch commit) {
        return () -> {
            try {
                serializable().executeWithoutResult(status -> {
                    jdbc.update(sql);
                    ready.countDown();
                    try {
                        if (!commit.await(15, TimeUnit.SECONDS)) {
                            throw new IllegalStateException("동시 트랜잭션 대기 시간 초과");
                        }
                    } catch (InterruptedException exception) {
                        Thread.currentThread().interrupt();
                        throw new IllegalStateException(exception);
                    }
                });
                return true;
            } catch (DataAccessException exception) {
                return false;
            }
        };
    }

    private TransactionTemplate serializable() {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setIsolationLevel(TransactionDefinition.ISOLATION_SERIALIZABLE);
        transaction.setTimeout(20);
        return transaction;
    }
}
