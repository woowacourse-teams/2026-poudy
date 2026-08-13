
  export namespace Schemas {
    // <Schemas>
  export type BrandResponse = { id: number, logoUrl: string, name: string, productCount: number }
export type BrandListResponse = { items: Array<BrandResponse> }
export type CategoryChildResponse = { id: number, name: string, productCount: number }
export type CategoryResponse = { children: Array<CategoryChildResponse>, id: number, name: string, productCount: number }
export type CategoryListResponse = { items: Array<CategoryResponse> }
export type EffectResponse = { color: string, id: number, name: string }
export type IngredientSummaryResponse = { englishName: string, id: number, koreanName: string }
export type IngredientDetailResponse = { description: string, effectSources: Array<string>, effects: Array<EffectResponse>, englishName: string, groupCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, id: number, infoSources: Array<string>, koreanName: string, productCount: number, relatedIngredients: Array<IngredientSummaryResponse>, updatedAt: string }
export type IngredientResponse = { effects: Array<EffectResponse>, englishName: string, groupCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, id: number, koreanName: string }
export type IngredientListResponse = { items: Array<IngredientResponse> }

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

  // </Endpoints>
  }
  
  
     // <EndpointByMethod>
     export type EndpointByMethod = {
     get: {
           "/api/brands": Endpoints.get_FindBrands,
"/api/brands/{brandId}": Endpoints.get_FindBrand,
"/api/categories": Endpoints.get_FindCategories,
"/api/ingredients": Endpoints.get_FindIngredients,
"/api/ingredients/{ingredientId}": Endpoints.get_FindIngredient
         }
     }
     
     // </EndpointByMethod>
     

    // <EndpointByMethod.Shorthands>
    export type GetEndpoints = EndpointByMethod["get"]
    // </EndpointByMethod.Shorthands>
    