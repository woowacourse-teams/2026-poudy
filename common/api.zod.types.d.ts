
  export namespace Schemas {
    // <Schemas>
  export type EffectResponse = { color: string, id: number, name: string }
export type IngredientSummaryResponse = { englishName: string, id: number, koreanName: string }
export type IngredientDetailResponse = { description: string, effectSources: Array<string>, effects: Array<EffectResponse>, englishName: string, groupCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, id: number, infoSources: Array<string>, koreanName: string, productCount: number, relatedIngredients: Array<IngredientSummaryResponse>, updatedAt: string }
export type IngredientResponse = { effects: Array<EffectResponse>, englishName: string, groupCodes: Array<("SENSITIVE" | "FRAGRANCE" | "ETHANOL" | "PARABEN_7" | "MINERAL_OIL" | "ALLERGEN")>, id: number, koreanName: string }
export type IngredientListResponse = { items: Array<IngredientResponse> }

    // </Schemas>
    }
  
  export namespace Endpoints {
  // <Endpoints>
  
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
           "/api/ingredients": Endpoints.get_FindIngredients,
"/api/ingredients/{ingredientId}": Endpoints.get_FindIngredient
         }
     }
     
     // </EndpointByMethod>
     

    // <EndpointByMethod.Shorthands>
    export type GetEndpoints = EndpointByMethod["get"]
    // </EndpointByMethod.Shorthands>
    