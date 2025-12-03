import { convertVariablesToCSS } from "./lib/figma-variables";

export default function () {
  figma.showUI(__html__, { width: 300, height: 260, themeColors: true });

  figma.ui.onmessage = async (message) => {
    if (message.type === "RESIZE_UI") {
      const { width, height } = message;
      figma.ui.resize(width, height);
    }
    if (message.type === "CONVERT_VARIABLES") {
      const formattedCSS = await convertVariablesToCSS();

      // Send results back to UI
      figma.ui.postMessage({
        type: "VARIABLES_CONVERTED",
        data: formattedCSS,
      });
    }
  };
}
