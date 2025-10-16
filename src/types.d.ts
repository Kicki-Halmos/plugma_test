export interface Collection {
  id: string;
  modes: Mode[];
  name: string;
  variableIds: string[];
}

export interface Mode {
  modeId: string;
  name: string;
}

export interface VariableValue {
  id: string;
  type: string;
  value: string | number | ColorValue;
}

export interface ColorValue {
  a: string;
  b: string;
  g: string;
  r: string;
}
export interface cssCollections {
  collection: string;
  theme: string;
  name: string;
  value: string;
  type: string;
  id: string;
}
