package com.poudy.product.repository;

import com.poudy.product.domain.Mark;
import com.poudy.product.domain.MarkFilterGroup;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.support.SqlArrayValue;
import tools.jackson.databind.json.JsonMapper;

public final class MarkSqlParameters {
    private static final String DEFINITIONS = JsonMapper.builder().build().writeValueAsString(
        Arrays.stream(Mark.values()).map(mark -> Map.of("code", mark.code(), "name", mark.displayName())).toList()
    );

    private static final List<FilterMark> FILTER_MARKS = Arrays.stream(MarkFilterGroup.values())
        .flatMap(group -> group.marks().stream().map(mark -> new FilterMark(mark.code(), group.name())))
        .toList();

    private MarkSqlParameters() {
    }

    public static String definitions() {
        return DEFINITIONS;
    }

    public static MapSqlParameterSource filters() {
        return new MapSqlParameterSource()
            .addValue(
                "filterMarkCodes",
                new SqlArrayValue("text", FILTER_MARKS.stream().map(FilterMark::code).toArray())
            )
            .addValue(
                "filterMarkGroups",
                new SqlArrayValue("text", FILTER_MARKS.stream().map(FilterMark::group).toArray())
            );
    }

    private record FilterMark(String code, String group) {
    }
}
