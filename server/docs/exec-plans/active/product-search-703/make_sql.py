"""고정 질의 세트로 pgbench 스크립트를 만든다. 목록·개수 SQL은 ProductQueryRepository 의 문자열을 필터 없이 옮긴 것이다."""
import pathlib
import sys

CANDIDATES = """
with searched as materialized (
    select (item ->> 'productId')::bigint as id, (item ->> 'rank')::bigint as search_rank
    from {search} result, jsonb_array_elements(result.items) item
), candidates as materialized (
    select p.*, c.parent_id, searched.search_rank as search_rank,
        (cardinality(cast('{{}}' as bigint[])) = 0) as brand_ok,
        (cardinality(cast('{{}}' as bigint[])) = 0) as category_ok,
        (cast(null as text) is null) as skin_ok
    from product p join searched on searched.id = p.id join category c on c.id = p.category_id
    where (not false or p.is_sensitive_skin)
      and not exists (select 1 from unnest(cast('{{}}' as text[])) wanted(code)
          where not exists (select 1 from product_component pc
              join product_ingredient pi on pi.component_id = pc.id
              join ingredient_group_ingredient g on g.ingredient_id = pi.ingredient_id
              where pc.product_id = p.id and g.group_code = wanted.code))
), matched as (select * from candidates where brand_ok and category_ok and skin_ok)
"""

PAGE = """
, page as (
    select m.id, row_number() over (order by {order}, m.id) as position
    from matched m join lateral (select price, volume_value, volume_unit from product_variant v
        where v.product_id = m.id order by v.display_order limit 1) v on true
    order by {order}, m.id limit 20 offset 0
), scopes as materialized (
    select p.*, scope.name from candidates p
    cross join lateral (values
        ('MATCH', brand_ok and category_ok and skin_ok),
        ('BRAND_OPTION', true and category_ok and skin_ok),
        ('CATEGORY_OPTION', true and brand_ok and skin_ok),
        ('SKIN_OPTION', true and brand_ok and category_ok)) scope(name, eligible)
    where scope.eligible
)
select 'TOTAL' as section, null::text as id, count(*) as amount from matched
union all select 'PAGE', id::text, position from page
union all select name || '_BRAND', brand_id::text, count(*) from scopes
    where name in ('MATCH', 'BRAND_OPTION') group by name, brand_id
union all select name || '_CATEGORY', category.id::text, count(*) from scopes
    cross join lateral (values (category_id), (parent_id)) category(id)
    where name in ('MATCH', 'CATEGORY_OPTION') group by name, category.id
union all select name || '_SKIN', s.skin_type_code, count(*) from scopes p
    join product_skin_type s on s.product_id = p.id
    where name in ('MATCH', 'SKIN_OPTION') group by name, s.skin_type_code
"""


def literal(text):
    return "'" + text.replace("'", "''") + "'"


# 서버가 부르는 검색 함수 형식. #796 에서 모드 함수로 바꾸면 여기만 고친다.
SUGGEST = "search_products({q}, 0, 20, 3)"
CATALOG = "search_products({q}, 0, {limit}, 2)"


def shapes(query):
    q = literal(query)
    listing = CATALOG.format(q=q, limit="null")
    return {
        "suggest": "select total, items from {};".format(SUGGEST.format(q=q)),
        "list_default": (CANDIDATES.format(search=listing) + PAGE.format(order="m.search_rank asc")).strip() + ";",
        "list_price": (CANDIDATES.format(search=listing) + PAGE.format(order="v.price asc")).strip() + ";",
        "count": (CANDIDATES.format(search=listing) + " select count(*) from matched").strip() + ";",
        "exists": "select total > 0 from {};".format(CATALOG.format(q=q, limit="1")),
    }


def main():
    queries = pathlib.Path(sys.argv[1])
    out = pathlib.Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for line in queries.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        qid, query = line.split("\t", 1)
        for shape, sql in shapes(query).items():
            # pgbench 는 스크립트의 한 줄을 한 명령으로 읽으므로 한 줄로 합친다.
            (out / f"{qid}__{shape}.sql").write_text(" ".join(sql.split()) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
