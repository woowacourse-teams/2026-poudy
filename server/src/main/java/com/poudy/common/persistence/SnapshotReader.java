package com.poudy.common.persistence;

import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class SnapshotReader {

    private final TransactionTemplate transactionTemplate;

    public SnapshotReader(PlatformTransactionManager transactionManager) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setReadOnly(true);
        template.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        this.transactionTemplate = template;
    }

    public <T> T read(Supplier<T> reader) {
        return transactionTemplate.execute(status -> reader.get());
    }
}
