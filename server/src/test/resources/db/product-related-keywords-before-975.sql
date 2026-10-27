
with searched as materialized (
    select coalesce(corrected_query, :keyword) as query, items from search_products_v2(:keyword, 0, :limit, 2)
), result as materialized (
    select searched.*, search_product_key(search_norm(query)) as norm,
        search_product_has_spelling(search_norm(query)) as has_spelling from searched
), tokens as materialized (
    select t.* from result, search_product_query_tokens(result.query) t
), metadata as materialized (
    select m.*, t.norm, t.read, t.has_spelling from result,
    search_product_metadata_hits(result.query) m join tokens t on t.ord=m.ord
), hits as (
    select item.position, result.norm as query, result.has_spelling, d.*
    from result, jsonb_array_elements(result.items) with ordinality item(value, position)
    join product_search_document d on d.product_id = (item.value ->> 'productId')::bigint
), prefixed as (
    select h.position, h.product_id, h.query, h.has_spelling, h.product_name, case
        when greatest(strpos(case when h.has_spelling then coalesce(h.product_key,h.product_norm) else h.product_norm end, h.query),
            strpos(case when h.has_spelling then coalesce(h.product_read_key,h.product_read) else h.product_read end, h.query),
            strpos(h.product_chosung, h.query)) > 0
            and not exists (select 1 from tokens t where not (
                (case when t.has_spelling then coalesce(h.product_key,h.product_norm) else h.product_norm end) like '%' || t.norm || '%'
                or (case when t.has_spelling then coalesce(h.product_read_key,h.product_read) else h.product_read end) like '%' || t.read || '%'
                or (t.is_chosung and h.product_chosung similar to t.chosung_contains))) then null
        else coalesce(nullif(concat_ws(' ',
            case when exists (select 1 from tokens t
                where ((case when t.has_spelling then coalesce(h.brand_key,h.brand_norm) else h.brand_norm end) like '%' || t.norm || '%' or (case when t.has_spelling then coalesce(h.brand_read_key,h.brand_read) else h.brand_read end) like '%' || t.read || '%')
                  and (case when t.has_spelling then coalesce(h.product_key,h.product_norm) else h.product_norm end) not like '%' || t.norm || '%'
                  and (case when t.has_spelling then coalesce(h.product_read_key,h.product_read) else h.product_read end) not like '%' || t.read || '%')
                then h.brand_korean_name end,
            (select string_agg(m.text, ' ' order by m.ord, m.text) from (
                select distinct on (m.text) m.text, m.ord from metadata m
                where m.product_id = h.product_id
                  and (case when m.has_spelling then coalesce(h.product_key,h.product_norm) else h.product_norm end) not like '%' || m.norm || '%'
                  and (case when m.has_spelling then coalesce(h.product_read_key,h.product_read) else h.product_read end) not like '%' || m.read || '%'
                order by m.text, m.ord) m)
        ), ''), h.brand_korean_name) end as prefix
    from hits h
), keywords as (
    select position, product_id, query, has_spelling, prefix, product_name,
        concat_ws(' ', prefix, product_name) as keyword from prefixed
), splits as (
    select k.position, k.has_spelling, sp.brand_part, sp.name_part, sp.brand_first, case when v.is_chosung
            then d.brand_chosung = sp.brand_part
            else sp.brand_part in (v.brand_norm, v.brand_read, v.brand_english_norm) end as brand_exact,
        case when v.is_chosung then d.brand_chosung like sp.brand_part || '%'
            else v.brand_norm like sp.brand_part || '%' or v.brand_read like sp.brand_part || '%'
                or v.brand_english_norm like sp.brand_part || '%' end as brand_prefix,
        case when v.is_chosung then d.product_chosung = sp.name_part
            else sp.name_part in (v.product_norm, v.product_read)
                or v.product_read = search_read_query(sp.name_part) end as product_exact,
        case when v.is_chosung then d.product_chosung like sp.name_part || '%'
            else v.product_norm like sp.name_part || '%' or v.product_read like sp.name_part || '%'
                or v.product_read like search_read_query(sp.name_part) || '%' end as product_prefix,
        case when v.is_chosung then d.product_chosung like '%' || sp.name_part || '%'
            else v.product_norm like '%' || sp.name_part || '%' or v.product_read like '%' || sp.name_part || '%'
                or v.product_read like '%' || search_read_query(sp.name_part) || '%' end as product_contains
    from keywords k
    join product_search_document d on d.product_id = k.product_id
    cross join lateral (select
        case when k.has_spelling then coalesce(d.product_key, d.product_norm) else d.product_norm end as product_norm,
        case when k.has_spelling then coalesce(d.product_read_key, d.product_read) else d.product_read end as product_read,
        case when k.has_spelling then coalesce(d.brand_key, d.brand_norm) else d.brand_norm end as brand_norm,
        case when k.has_spelling then coalesce(d.brand_read_key, d.brand_read) else d.brand_read end as brand_read,
        case when k.has_spelling then coalesce(d.brand_english_key, d.brand_english_norm)
            else d.brand_english_norm end as brand_english_norm,
        k.query ~ '^[ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ]+$' as is_chosung) v
    cross join generate_series(1, length(k.query) - 1) g(i)
    cross join lateral (values
        (left(k.query, g.i), substr(k.query, g.i + 1), true),
        (substr(k.query, g.i + 1), left(k.query, g.i), false)
    ) sp(brand_part, name_part, brand_first)
    where k.prefix is not null and (select count(*) from tokens) = 1
), split_chosen as (
    select distinct on (s.position) s.position, s.has_spelling, s.brand_part, s.name_part
    from splits s
    where (s.brand_exact or (length(s.brand_part) >= 2 and s.brand_prefix)) and s.product_contains
    order by s.position,
        case when s.brand_first and s.brand_exact and s.product_exact then 0
            when s.brand_first and s.brand_exact and s.product_prefix then 1 else 2 end,
        s.brand_first::int + s.brand_exact::int + s.product_prefix::int desc,
        length(s.name_part) desc, s.name_part collate "C"
), split_matched as (
    select s.position, array[r.brand_range,
        array[r.name_range[1] + r.gap, r.name_range[2] + r.gap]] as ranges
    from split_chosen s join keywords k on k.position = s.position,
    lateral (select search_match_range(k.prefix, case when s.has_spelling
            then search_product_match_piece(k.prefix, s.brand_part) else s.brand_part end) as brand_range,
        search_match_range(k.product_name, case when s.has_spelling
            then search_product_match_piece(k.product_name, s.name_part) else s.name_part end) as name_range,
        search_utf16_index(k.keyword, length(k.prefix) + 1) as gap) r
    where r.brand_range is not null and r.name_range is not null
), matched as (
    select k.position, k.keyword, k.prefix, coalesce(
        case when whole.range is not null then array[whole.range] end,
        (select array_agg(r.range) from (
            select search_match_range(k.keyword, case when t.has_spelling
            then search_product_match_piece(k.keyword, t.norm) else t.raw end) as range from tokens t) r
            where r.range is not null),
        (select sm.ranges from split_matched sm where sm.position = k.position)
    ) as ranges
    from keywords k left join lateral (select search_match_range(k.keyword, case when k.has_spelling
    then search_product_match_piece(k.keyword, k.query) else k.query end) as range
    where not k.has_spelling or not exists (select 1 from tokens t where not t.has_spelling)) whole on true
)
select keyword, coalesce(ranges,
    array[array[0, search_utf16_index(keyword, length(prefix))]]) as match_ranges
from matched
where search_utf16_index(keyword, length(keyword)) <= :maxLength
order by position
