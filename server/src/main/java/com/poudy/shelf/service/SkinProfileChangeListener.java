package com.poudy.shelf.service;

import com.poudy.user.domain.SkinProfileChanged;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class SkinProfileChangeListener {

    private static final Logger log = LoggerFactory.getLogger(SkinProfileChangeListener.class);

    private final ShelfService shelfService;

    public SkinProfileChangeListener(ShelfService shelfService) {
        this.shelfService = shelfService;
    }

    // 피부 정보 저장이 커밋된 뒤에 다시 계산한다. 직전 결과는 다시 만들 수 있는 값이라 실패해도 저장은 되돌리지 않는다.
    @TransactionalEventListener
    public void refreshShelfAnalysis(SkinProfileChanged event) {
        try {
            shelfService.refreshAnalysisForSkinChange(event.userId());
        } catch (RuntimeException exception) {
            log.error(
                "Skin profile was stored but shelf analysis refresh failed: userId={}",
                event.userId(),
                exception
            );
        }
    }
}
