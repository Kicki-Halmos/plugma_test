import type { ColorValue } from "../types";
import { parseValue } from "./parsers";

export const COLLECTION_TYPES = {
  THEME: "Theme",
  CORE: "Core",
  RESPONSIVE: "Responsive",
} as const;

/**
 * Resolve a variable value, handling aliases
 */
export async function resolveVariableValue(
  rawValue: any
): Promise<string | number | ColorValue | null> {
  if (typeof rawValue === "object" && "id" in rawValue) {
    const resolvedVariable = await figma.variables.getVariableByIdAsync(
      rawValue.id
    );
    if (!resolvedVariable) return null;

    const valueKey = Object.keys(resolvedVariable.valuesByMode)[0];
    return resolvedVariable.valuesByMode[valueKey] as
      | string
      | number
      | ColorValue;
  }
  return rawValue as string | number | ColorValue;
}

/**
 * Process a single responsive variable across all modes
 */
async function processResponsiveVariable(
  variable: Variable,
  collection: VariableCollection,
  responsiveVariableValues: Map<
    string,
    Array<{ mode: string; value: string; type: string }>
  >
): Promise<void> {
  const modeResults = await Promise.all(
    collection.modes.map(async (mode) => {
      try {
        const rawValue = variable.valuesByMode[mode.modeId];
        const variableValue = await resolveVariableValue(rawValue);
        if (!variableValue) return null;

        return {
          mode: mode.name,
          value: parseValue(variableValue, variable.resolvedType),
          type: variable.resolvedType,
        };
      } catch (error) {
        console.error(
          "Error processing responsive variable:",
          variable?.name,
          mode.name,
          error
        );
        return null;
      }
    })
  );

  // Filter out null results and add to responsiveVariableValues
  const validResults = modeResults.filter((r) => r !== null);
  if (validResults.length > 0) {
    responsiveVariableValues.set(variable.name, validResults);
  }
}

/**
 * Process a single variable from Theme or Core collection
 */
async function processStandardVariable(
  variable: Variable,
  collection: VariableCollection,
  mode: { modeId: string; name: string },
  themeGroups: Map<string, Array<{ name: string; value: string; type: string }>>
): Promise<void> {
  try {
    let variableValue: string | number | ColorValue | null;

    // Handle Theme collection - resolve aliased variables
    if (collection.name === COLLECTION_TYPES.THEME) {
      const aliasedValue = variable.valuesByMode[mode.modeId];
      variableValue = await resolveVariableValue(aliasedValue);
    } else {
      // Handle Core and other collections - use direct values
      const valueKey = Object.keys(variable.valuesByMode)[0];
      variableValue = variable.valuesByMode[valueKey] as
        | string
        | number
        | ColorValue;
    }

    if (!variableValue) return;

    // Determine the group key
    const groupKey =
      collection.name === COLLECTION_TYPES.CORE ? "Core" : mode.name;

    // Initialize group if it doesn't exist
    if (!themeGroups.has(groupKey)) {
      themeGroups.set(groupKey, []);
    }

    // Add the variable to the group
    themeGroups.get(groupKey)?.push({
      name: variable.name,
      value: parseValue(variableValue, variable.resolvedType),
      type: variable.resolvedType,
    });
  } catch (error) {
    console.error("Error processing variable:", variable?.name, error);
  }
}

/**
 * Separate responsive variables into unchanging and mode-specific groups
 */
function processResponsiveVariableGroups(
  responsiveVariableValues: Map<
    string,
    Array<{ mode: string; value: string; type: string }>
  >,
  themeGroups: Map<string, Array<{ name: string; value: string; type: string }>>
): void {
  Array.from(responsiveVariableValues.entries()).forEach(
    ([varName, modeValues]) => {
      const uniqueValues = new Set(modeValues.map((mv) => mv.value));

      if (uniqueValues.size === 1) {
        // All values are the same - add to "Responsive" group (no suffix)
        const groupKey = "Responsive";
        const existing = themeGroups.get(groupKey) || [];
        themeGroups.set(groupKey, [
          ...existing,
          {
            name: varName,
            value: modeValues[0].value,
            type: modeValues[0].type,
          },
        ]);
      } else {
        // Values differ across modes - add to mode-specific groups
        modeValues.forEach(({ mode, value, type }) => {
          const groupKey = `Responsive-${mode}`;
          const existing = themeGroups.get(groupKey) || [];
          themeGroups.set(groupKey, [
            ...existing,
            { name: varName, value, type },
          ]);
        });
      }
    }
  );
}

/**
 * Fetch and process all Figma variable collections
 */
export async function fetchAndProcessVariables(): Promise<
  Map<string, Array<{ name: string; value: string; type: string }>>
> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  const themeGroups = new Map<
    string,
    Array<{ name: string; value: string; type: string }>
  >();
  const responsiveVariableValues = new Map<
    string,
    Array<{ mode: string; value: string; type: string }>
  >();

  for (const collection of collections) {
    const variables = await Promise.all(
      collection.variableIds.map((id) =>
        figma.variables.getVariableByIdAsync(id)
      )
    );

    // Filter out invalid variables
    const validVariables = variables.filter(
      (v): v is Variable => v !== null && v.resolvedType !== undefined
    );

    // Process variables based on collection type
    if (collection.name === COLLECTION_TYPES.RESPONSIVE) {
      await Promise.all(
        validVariables.map((variable) =>
          processResponsiveVariable(
            variable,
            collection,
            responsiveVariableValues
          )
        )
      );
    } else {
      // Process all standard variables for all modes in parallel
      const processingTasks = validVariables.flatMap((variable) =>
        collection.modes.map((mode) =>
          processStandardVariable(variable, collection, mode, themeGroups)
        )
      );
      await Promise.all(processingTasks);
    }
  }

  // Process responsive variables: separate unchanging from mode-specific
  processResponsiveVariableGroups(responsiveVariableValues, themeGroups);

  return themeGroups;
}

/**
 * Convert Figma variables directly to CSS variables string
 */
export async function convertVariablesToCSS(): Promise<string> {
  try {
    const { formatThemeGroups } = await import("./formatters");

    // Fetch and process all variables from Figma
    const themeGroups = await fetchAndProcessVariables();

    // Format all theme groups into CSS
    const formattedCSS = formatThemeGroups(themeGroups);

    console.log("Formatted CSS:\n", formattedCSS);

    return formattedCSS;
  } catch (error) {
    console.error("Error converting variables:", error);
    figma.notify("Error converting variables. Check console for details.", {
      error: true,
    });
    return "";
  }
}
