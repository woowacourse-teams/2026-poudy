package com.poudy.excludecode.domain;

import java.util.List;
import java.util.Map;

public interface ExcludeCodeLookup {

    List<ExcludeCode> codesOf(Long ingredientId);

    Map<Long, List<ExcludeCodeSummary>> groupsOf(List<Long> ingredientIds);
}
