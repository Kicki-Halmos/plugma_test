// Read the docs https://plugma.dev/docs

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
          const variable =
            await figma.variables.getVariableByIdAsync(variableId);
          //console.log("variable", variable);
          if (collection.name !== "Responsive") {
            cssCollections.push({
              collection: collection.name,
              name: variable?.name,
              value: variable?.valuesByMode,
              type: variable?.resolvedType,
              id: variable?.id,
            });
          }
        }
      }

      console.log("cssCollections", cssCollections);
      /*       const localVariables = await figma.variables.getLocalVariablesAsync();
      console.log("localVariables", localVariables); */
    }
  };
}
