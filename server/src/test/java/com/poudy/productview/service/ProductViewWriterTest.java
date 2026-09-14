package com.poudy.productview.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.productview.repository.ProductViewRepository;
import java.io.IOException;
import org.junit.jupiter.api.Test;

class ProductViewWriterTest {

    @Test
    void savesAgainAfterRepositoryFailure() throws Exception {
        ProductViewRepository productViewRepository = mock(ProductViewRepository.class);
        ProductViewWriter productViewWriter = new ProductViewWriter(productViewRepository);
        doThrow(new IOException("disk unavailable")).doNothing().when(productViewRepository).saveChanges();

        assertThatCode(productViewWriter::save).doesNotThrowAnyException();
        productViewWriter.save();

        verify(productViewRepository, times(2)).saveChanges();
    }
}
