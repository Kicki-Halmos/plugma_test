import type { ColorValue, cssCollections } from "./types";
import { parseValue } from "./lib/functions";

const COLLECTION_TYPES = {
  THEME: "Theme",
  CORE: "Core",
} as const;

/**
 * Process a variable and create CSS collection entries for each mode
 */
async function processVariable(
  variable: Variable,
  collection: VariableCollection,
  mode: { modeId: string; name: string }
): Promise<cssCollections | null> {
  try {
    if (!variable || !variable.resolvedType) {
      console.warn("Invalid variable:", variable);
      return null;
    }

    let variableValue: string | number | ColorValue;

    // Handle Theme collection - resolve aliased variables
    if (collection.name === COLLECTION_TYPES.THEME) {
      const aliasedValue = variable.valuesByMode[mode.modeId];
      if (typeof aliasedValue === "object" && "id" in aliasedValue) {
        const resolvedVariable = await figma.variables.getVariableByIdAsync(
          aliasedValue.id
        );
        if (!resolvedVariable) return null;

        const valueKey = Object.keys(resolvedVariable.valuesByMode)[0];
        variableValue = resolvedVariable.valuesByMode[valueKey] as
          | string
          | number
          | ColorValue;
      } else {
        variableValue = aliasedValue as string | number | ColorValue;
      }
    }
    // Handle Core collection - use direct values
    else {
      const valueKey = Object.keys(variable.valuesByMode)[0];
      variableValue = variable.valuesByMode[valueKey] as
        | string
        | number
        | ColorValue;
    }

    return {
      collection: collection.name,
      theme: mode.name,
      name: variable.name,
      value: parseValue(variableValue, variable.resolvedType),
      type: variable.resolvedType,
      id: variable.id,
    };
  } catch (error) {
    console.error("Error processing variable:", variable?.name, error);
    return null;
  }
}

/**
 * Convert Figma variables to CSS collections
 */
async function convertVariables(): Promise<cssCollections[]> {
  const cssCollections: cssCollections[] = [];

  try {
    const collections =
      await figma.variables.getLocalVariableCollectionsAsync();
    console.log("collections", collections);

    for (const collection of collections) {
      if (
        collection.name !== COLLECTION_TYPES.THEME &&
        collection.name !== COLLECTION_TYPES.CORE
      ) {
        continue;
      }

      for (const variableId of collection.variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(variableId);
        if (!variable) continue;

        // Process each mode for this variable
        for (const mode of collection.modes) {
          const result = await processVariable(variable, collection, mode);
          if (result) {
            cssCollections.push(result);
          }
        }
      }
    }

    console.log("cssCollections", cssCollections);
    return cssCollections;
  } catch (error) {
    console.error("Error converting variables:", error);
    figma.notify("Error converting variables. Check console for details.", {
      error: true,
    });
    return [];
  }
}

export default function () {
  figma.showUI(__html__, { width: 300, height: 260, themeColors: true });

  figma.ui.onmessage = async (message) => {
    if (message.type === "CONVERT_VARIABLES") {
      const cssCollections = await convertVariables();

      // Send results back to UI
      figma.ui.postMessage({
        type: "VARIABLES_CONVERTED",
        data: cssCollections,
      });
    }
  };
}
