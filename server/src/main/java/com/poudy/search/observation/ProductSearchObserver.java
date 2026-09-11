package com.poudy.search.observation;

import com.poudy.search.domain.SearchKeyword;

public interface ProductSearchObserver {
    void completed(SearchKeyword keyword, long totalElements);
}
