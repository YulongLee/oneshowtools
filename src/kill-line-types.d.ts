export type FeatureStatus = "supported" | "partial" | "unsupported" | "unknown";
export type KillLineMode = "manual" | "linear" | "curve" | "formula";

export interface ProductPoint {
  id: string;
  name: string;
  logo: string;
  xValue: number;
  yValue: number;
  price: string;
  duration: string;
  description: string;
  note: string;
  highlight: boolean;
  visible: boolean;
  color: string;
  features: Record<string, FeatureStatus>;
}

export interface AxisConfig {
  xName: string;
  xUnit: string;
  yName: string;
  yUnit: string;
  xDirection: "lower" | "higher";
  yDirection: "lower" | "higher";
  xScale: "linear" | "log";
}

export interface KillLineConfig {
  mode: KillLineMode;
  base: number;
  range: number;
  scale: number;
  slope: number;
  intercept: number;
  formula: string;
  points: Array<{ x: number; y: number }>;
}

export interface RegionConfig {
  visible: boolean;
  passName: string;
  balanceName: string;
  killedName: string;
}

export interface PresentationConfig {
  interval: number;
  speed: number;
  order: "data" | "reverse" | "x-asc" | "x-desc";
  killAnimation: boolean;
}

export interface KillLineProject {
  version: number;
  template: string;
  title: string;
  subtitle: string;
  axes: AxisConfig;
  products: ProductPoint[];
  dimensions: Array<{ id: string; name: string; weight: number }>;
  scoring: Record<FeatureStatus, number>;
  line: KillLineConfig;
  regions: RegionConfig;
  presentation: PresentationConfig;
  export: { width: number; height: number };
}
