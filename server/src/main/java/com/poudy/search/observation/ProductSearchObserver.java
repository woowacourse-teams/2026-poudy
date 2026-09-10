package com.poudy.search.observation;

import com.poudy.search.domain.SearchKeyword;

/** One completed first-page query, after every product filter has been applied. */
public interface ProductSearchObserver {
    void completed(SearchKeyword keyword, long totalElements);
}
