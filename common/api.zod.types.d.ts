
  export namespace Schemas {
    // <Schemas>
  export type BenefitResponse = { color: string, id: number, ingredientIds: Array<number>, name: string }
export type BrandResponse = { id: number, logoUrl: string, name: string, productCount: number }
export type BrandListResponse = { items: Array<BrandResponse> }
export type BrandSummaryResponse = { id: number, logoUrl: string, name: string }
export type CategoryChildResponse = { id: number, name: string, productCount: number }
export type CategoryResponse = { children: Array<CategoryChildResponse>, id: number, name: string, productCount: number }
export type CategoryListResponse = { items: Array<CategoryResponse> }
export type CategorySummaryResponse = { id: number, name: string }
export type EffectResponse = { color: string, id: number, name: string }
export type IngredientSummaryResponse = { englishName: string, id: number, koreanName: string }
export type IngredientDetailResponse = { description: string, effectSources: Array<string>, effects: Array<EffectResponse>, englishName: string, groupCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, id: number, infoSources: Array<string>, koreanName: string, productCount: number, relatedIngredients: Array<IngredientSummaryResponse>, updatedAt: string }
export type IngredientResponse = { effects: Array<EffectResponse>, englishName: string, groupCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, id: number, koreanName: string }
export type IngredientListResponse = { items: Array<IngredientResponse> }
export type ProductCountResponse = { count: number }
export type ProductIngredientResponse = { effects: Array<EffectResponse>, englishName: string, id: number, koreanName: string }
export type ProductDetailResponse = { benefits: Array<BenefitResponse>, brand: BrandSummaryResponse, categories: Array<CategorySummaryResponse>, freeOfCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, id: number, imageUrl: string, ingredients: Array<ProductIngredientResponse>, moistureLevel: number, name: string, oilLevel: number, price: number, volumeUnit: string, volumeValue: number }
export type ProductResponse = { brand: BrandSummaryResponse, id: number, imageUrl: string, name: string, price: number, volumeUnit: string, volumeValue: number }
export type ProductPageResponse = { hasNext: boolean, items: Array<ProductResponse>, page: number, size: number }

    // </Schemas>
    }
  
  export namespace Endpoints {
  // <Endpoints>
  
  export type get_FindBrands = {
      method: "GET",
      path: "/api/brands",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{ keyword: string }>,
        
        
        
        
          }
      responses: {200: Schemas.BrandListResponse,
},
      
    }
export type get_FindBrand = {
      method: "GET",
      path: "/api/brands/{brandId}",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            
        path:  { brandId: number },
        
        
        
          }
      responses: {200: Schemas.BrandResponse,
},
      
    }
export type get_FindCategories = {
      method: "GET",
      path: "/api/categories",
      requestFormat: "json",
      responseFormat: "json",
      parameters: never,
      responses: {200: Schemas.CategoryListResponse,
},
      
    }
export type get_FindIngredients = {
      method: "GET",
      path: "/api/ingredients",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{ keyword: string }>,
        
        
        
        
          }
      responses: {200: Schemas.IngredientListResponse,
},
      
    }
export type get_FindIngredient = {
      method: "GET",
      path: "/api/ingredients/{ingredientId}",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            
        path:  { ingredientId: number },
        
        
        
          }
      responses: {200: Schemas.IngredientDetailResponse,
},
      
    }
export type get_FindProducts = {
      method: "GET",
      path: "/api/products",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{ keyword: string, categoryIds: Array<number>, brandIds: Array<number>, moistureLevel: Array<number>, oilLevel: Array<number>, excludeCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, includeIngredientIds: Array<number>, excludeIngredientIds: Array<number>, sort: "NAME_ASC", page: number, size: number }>,
        
        
        
        
          }
      responses: {200: Schemas.ProductPageResponse,
},
      
    }
export type get_CountProducts = {
      method: "GET",
      path: "/api/products/count",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{ keyword: string, categoryIds: Array<number>, brandIds: Array<number>, moistureLevel: Array<number>, oilLevel: Array<number>, excludeCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, includeIngredientIds: Array<number>, excludeIngredientIds: Array<number> }>,
        
        
        
        
          }
      responses: {200: Schemas.ProductCountResponse,
},
      
    }
export type get_FindProduct = {
      method: "GET",
      path: "/api/products/detail/{productId}",
      requestFormat: "json",
      responseFormat: "json",
      parameters: {
            query?:  Partial<{ view: ("DETAIL" | "SIMPLE") }>,
        path:  { productId: number },
        
        
        
          }
      responses: {200: (Schemas.ProductDetailResponse | Schemas.ProductResponse),
},
      
    }

  // </Endpoints>
  }
  
  
     // <EndpointByMethod>
     export type EndpointByMethod = {
     get: {
           "/api/brands": Endpoints.get_FindBrands,
"/api/brands/{brandId}": Endpoints.get_FindBrand,
"/api/categories": Endpoints.get_FindCategories,
"/api/ingredients": Endpoints.get_FindIngredients,
"/api/ingredients/{ingredientId}": Endpoints.get_FindIngredient,
"/api/products": Endpoints.get_FindProducts,
"/api/products/count": Endpoints.get_CountProducts,
"/api/products/detail/{productId}": Endpoints.get_FindProduct
         }
     }
     
     // </EndpointByMethod>
     

    // <EndpointByMethod.Shorthands>
    export type GetEndpoints = EndpointByMethod["get"]
    // </EndpointByMethod.Shorthands>
    