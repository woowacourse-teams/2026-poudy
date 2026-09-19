package com.poudy.common.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;

@DisplayName("기동 스냅샷")
class SnapshotReaderStartupTest {

    private final PlatformTransactionManager transactionManager = mock(PlatformTransactionManager.class);
    private final TransactionStatus startup = new SimpleTransactionStatus();

    @Test
    @DisplayName("생성할 때 읽기 전용 REPEATABLE READ 트랜잭션 하나를 열고 모든 빈이 만들어지면 커밋한다")
    void opensOneSnapshotUntilSingletonsAreInstantiated() {
        given(transactionManager.getTransaction(any())).willReturn(startup);

        SnapshotReader reader = new SnapshotReader(transactionManager);
        reader.afterSingletonsInstantiated();

        verify(transactionManager).getTransaction(
            argThat(
                (TransactionDefinition definition) -> definition.isReadOnly()
                    && definition.getIsolationLevel() == TransactionDefinition.ISOLATION_REPEATABLE_READ
            )
        );
        verify(transactionManager).commit(startup);
        verify(transactionManager, never()).rollback(any());
    }

    @Test
    @DisplayName("기동이 끝나기 전에 컨텍스트가 닫히면 기동 트랜잭션을 되돌린다")
    void rollsBackWhenStartupFails() {
        given(transactionManager.getTransaction(any())).willReturn(startup);

        SnapshotReader reader = new SnapshotReader(transactionManager);
        reader.destroy();

        verify(transactionManager).rollback(startup);
        verify(transactionManager, never()).commit(any());
    }

    @Test
    @DisplayName("기동이 끝난 뒤의 읽기는 새 트랜잭션에서 실행한다")
    void readsInNewTransactionAfterStartup() {
        given(transactionManager.getTransaction(any())).willReturn(startup, new SimpleTransactionStatus());

        SnapshotReader reader = new SnapshotReader(transactionManager);
        reader.afterSingletonsInstantiated();
        String value = reader.read(() -> "읽음");

        assertThat(value).isEqualTo("읽음");
        verify(transactionManager, times(2)).getTransaction(any());
        reader.destroy();
        verify(transactionManager, never()).rollback(any());
    }
}
