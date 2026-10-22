-- #925: 표준형뿐 아니라 검색어의 영문 읽기도 실제 원문 조각으로 복원한다.
CREATE OR REPLACE FUNCTION search_product_match_piece(p_text text, p_piece text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE
AS $$
DECLARE
    form text;
    needle text;
    needles text[] := ARRAY[search_product_key(search_norm(p_piece))];
    reading text := CASE WHEN needles[1] ~ '[a-z]' THEN search_read_query(needles[1]) ELSE needles[1] END;
    standardized text;
    position int;
    start_offset int;
    end_offset int;
    same_length boolean := true;
    rule text[];
BEGIN
    IF reading <> needles[1] THEN needles := array_append(needles, reading); END IF;
    FOREACH rule SLICE 1 IN ARRAY search_product_spelling_rules()
    LOOP
        same_length := same_length AND length(rule[1]) = length(rule[2]);
    END LOOP;
    -- 원래 검색 형태를 먼저 찾고, 영문 읽기가 다를 때만 대체 형태를 시도한다.
    FOREACH needle IN ARRAY needles
    LOOP
        FOREACH form IN ARRAY ARRAY[search_norm(p_text), search_reading_name(p_text)]
        LOOP
            IF strpos(form, needle) > 0 THEN RETURN p_piece; END IF;
            standardized := search_product_key(form);
            position := strpos(standardized, needle);
            IF position = 0 THEN CONTINUE; END IF;
            IF same_length THEN RETURN substr(form, position, length(needle)); END IF;
            -- 길이가 다른 완성 표기를 추가해도 원문 위치는 표준형의 문자 수로 추측하지 않는다.
            WITH prefixes AS MATERIALIZED (
                SELECT i, search_product_key(left(form, i)) AS value
                FROM generate_series(0, length(form)) g(i)
            ), boundaries AS (
                SELECT i, length(value) AS size FROM prefixes
                WHERE value = left(standardized, length(value))
            )
            SELECT max(i) FILTER (WHERE size <= position - 1),
                   max(i) FILTER (WHERE size = (SELECT min(size) FROM boundaries
                                               WHERE size >= position - 1 + length(needle)))
            INTO start_offset, end_offset FROM boundaries;
            IF start_offset IS NOT NULL AND end_offset > start_offset THEN
                RETURN substr(form, start_offset + 1, end_offset - start_offset);
            END IF;
        END LOOP;
    END LOOP;
    RETURN p_piece;
END
$$;
