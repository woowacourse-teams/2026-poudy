package com.poudy.common.persistence;

import java.util.function.Supplier;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

@Component
public class SnapshotReader implements SmartInitializingSingleton, DisposableBean {

    private final PlatformTransactionManager transactionManager;
    private final TransactionTemplate transactionTemplate;
    private TransactionStatus startupSnapshot;

    public SnapshotReader(PlatformTransactionManager transactionManager) {
        DefaultTransactionDefinition definition = new DefaultTransactionDefinition();
        definition.setReadOnly(true);
        definition.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        this.transactionManager = transactionManager;
        this.transactionTemplate = new TransactionTemplate(transactionManager, definition);
        this.startupSnapshot = transactionManager.getTransaction(definition);
    }

    public <T> T read(Supplier<T> reader) {
        return transactionTemplate.execute(status -> reader.get());
    }

    @Override
    public void afterSingletonsInstantiated() {
        if (startupSnapshot != null && !startupSnapshot.isCompleted()) {
            transactionManager.commit(startupSnapshot);
        }
        startupSnapshot = null;
    }

    @Override
    public void destroy() {
        if (startupSnapshot != null && !startupSnapshot.isCompleted()) {
            transactionManager.rollback(startupSnapshot);
        }
        startupSnapshot = null;
    }
}
