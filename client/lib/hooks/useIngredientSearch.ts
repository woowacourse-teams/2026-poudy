"use client";

import type { IngredientSuggestionResponse } from "@poudy/api/api.zod";

import { useSuggestions } from "./useSuggestions";

import { fetchIngredientSuggestions } from "@/lib/api/products";
import type { IngredientGroup } from "@/lib/domain/ingredient-groups";

type GroupRow = { readonly kind: "group"; readonly group: IngredientGroup };
type IngredientRow = { readonly kind: "ingredient"; readonly ingredient: IngredientSuggestionResponse };
type SearchRow = GroupRow | IngredientRow;

const isGroupRow = (row: SearchRow): row is GroupRow => row.kind === "group";
const isIngredientRow = (row: SearchRow): row is IngredientRow => row.kind === "ingredient";

const fetcher = async (keyword: string): Promise<readonly SearchRow[]> => {
  const response = await fetchIngredientSuggestions(keyword);
  return [
    ...response.groups.map((group): SearchRow => ({ kind: "group", group })),
    ...response.items.map((ingredient): SearchRow => ({ kind: "ingredient", ingredient })),
  ];
};

export const useIngredientSearch = (keyword: string) => {
  const { items: rows, loading } = useSuggestions(keyword, fetcher, "ingredient");

  return {
    loading,
    groups: rows.filter(isGroupRow).map((row) => row.group),
    items: rows.filter(isIngredientRow).map((row) => row.ingredient),
  };
};
