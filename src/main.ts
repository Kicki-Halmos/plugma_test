// Read the docs https://plugma.dev/docs

import type { ColorValue } from "./types";
import { parseValue } from "./lib/functions";

export default function () {
  let cssCollections = [];
  figma.showUI(__html__, { width: 300, height: 260, themeColors: true });

  figma.ui.onmessage = async (message) => {
    if (message.type === "CONVERT_VARIABLES") {
      /*      figma.variables
        .getLocalVariableCollectionsAsync()
        .then((localVariables) => {
          console.log("Local Variable Collections:", localVariables);
        }); */
      const collections =
        await figma.variables.getLocalVariableCollectionsAsync();
      console.log("collections", collections);
      for (const collection of collections) {
        for (const variableId of collection.variableIds) {
          const variable: Variable | null =
            await figma.variables.getVariableByIdAsync(variableId);
          /* if (collection.name === "Theme") {
            collection.modes.forEach(async (mode) => {
              const value = await figma.variables.getVariableByIdAsync(
                variable?.valuesByMode[mode.modeId].id
              );
              const valueKey = Object.keys(variable?.valuesByMode ?? {});
              cssCollections.push({
                collection: collection.name,
                theme: mode.name,
                name: variable?.name,
                value: parseValue(
                  value?.valuesByMode[valueKey[0]] as unknown as
                    | string
                    | number
                    | ColorValue,
                  variable?.resolvedType as string
                ),
                type: variable?.resolvedType,
                id: variable?.id,
              });
            });
          } */
          if (collection.name === "Core") {
            const valueKey = Object.keys(variable?.valuesByMode ?? {});
            collection.modes.forEach(async (mode) => {
              cssCollections.push({
                collection: collection.name,
                theme: mode.name,
                name: variable?.name,
                type: variable?.resolvedType,
                value: parseValue(
                  variable?.valuesByMode[valueKey[0]] as unknown as
                    | string
                    | number
                    | ColorValue,
                  variable?.resolvedType as string
                ),
                id: variable?.id,
              });
            });
          }
        }
        console.log("cssCollections", cssCollections);
      }

      /*       const localVariables = await figma.variables.getLocalVariablesAsync();
      console.log("localVariables", localVariables); */
    }
  };
}
