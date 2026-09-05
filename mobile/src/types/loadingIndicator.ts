export interface FacetDefinition {
  readonly angle: string;
  readonly axisRotation: string;
  readonly color: string;
  readonly counterRotation: string;
  readonly hinge: readonly [x: number, y: number];
  readonly points: string;
}

export interface FoldCurve {
  readonly inputRange: readonly number[];
  readonly outputRange: readonly number[];
}
