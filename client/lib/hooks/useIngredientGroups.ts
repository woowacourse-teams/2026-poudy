"use client";

import { useEffect, useState } from "react";

import { fetchIngredientGroup } from "@/lib/api/products";
import type { IngredientGroup, IngredientGroups } from "@/lib/domain/ingredient-groups";

export const useIngredientGroups = (
  codes: readonly string[],
  known: readonly IngredientGroup[] = [],
): IngredientGroups => {
  const key = [...new Set(codes)].sort().join(",");
  const [fetched, setFetched] = useState<IngredientGroups>(new Map());

  useEffect(() => {
    if (!key) return;

    const controller = new AbortController();

    Promise.all(
      key.split(",").map((code) =>
        fetchIngredientGroup(code)
          .then((group): IngredientGroup | undefined => ({
            code: group.code,
            name: group.name,
            ingredientIds: group.ingredients.map((ingredient) => ingredient.id),
          }))
          .catch(() => undefined),
      ),
    ).then((groups) => {
      if (controller.signal.aborted) return;
      const found = groups.filter((group): group is IngredientGroup => Boolean(group));
      setFetched(new Map(found.map((group) => [group.code, group])));
    });

    return () => controller.abort();
  }, [key]);

  return new Map([...fetched, ...known.map((group): [string, IngredientGroup] => [group.code, group])]);
};
