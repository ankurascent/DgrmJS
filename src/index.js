import { moveEvtMobileFix } from "./infrastructure/move-evt-mobile-fix.js";
import { CanvasSmbl } from "./infrastructure/canvas-smbl.js";
import { evtRouteApplay } from "./infrastructure/evt-route-applay.js";
import { tipShow, uiDisable } from "./ui/ui.js";
import { srvGet } from "./diagram/dgrm-srv.js";
import { deserialize } from "./diagram/dgrm-serialization.js";
import {
  copyPastApplay,
  groupSelectApplay,
} from "./diagram/group-select-applay.js";
import { shapeTypeMap } from "./shapes/shape-type-map.js";
import "./ui/menu.js";
import "./ui/shape-menu.js";

// @ts-ignore
/** @type {import('./infrastructure/canvas-smbl.js').CanvasElement} */ const canvas =
  document.getElementById("canvas");
canvas[CanvasSmbl] = {
  data: {
    position: { x: 0, y: 0 },
    scale: 1,
    cell: 24,
  },
  shapeMap: shapeTypeMap(canvas),
};

// Helper to dispatch onChange event
function dispatchOnChange(detail = {}) {
  const changeEvent = new CustomEvent("onChange", {
    detail: {
      canvasData: canvas[CanvasSmbl].data,
      shapeMap: canvas[CanvasSmbl].shapeMap,
      ...detail,
    },
  });
  canvas.dispatchEvent(changeEvent);
}

// Wrap moveScaleApplay to dispatch onChange

moveEvtMobileFix(canvas.ownerSVGElement);
evtRouteApplay(canvas.ownerSVGElement);
copyPastApplay(canvas);
groupSelectApplay(canvas); // groupSelectApplay must go before moveScaleApplay

/** @type { import('./ui/menu').Menu } */ (
  document.getElementById("menu")
).init(canvas);
/** @type { import('./ui/shape-menu').ShapeMenu } */ (
  document.getElementById("menu-shape")
).init(canvas);

// Wrap deserialize without reassigning
function wrappedDeserialize(canvas, appData) {
  const result = deserialize(canvas, appData);
  if (result) {
    dispatchOnChange({ changed: "diagram", source: "deserialize" });
  }
  return result;
}

// Wrap shapeMap to dispatch onChange for shape modifications
const originalShapeMap = canvas[CanvasSmbl].shapeMap;
canvas[CanvasSmbl].shapeMap = new Proxy(originalShapeMap, {
  set(target, key, value) {
    target[key] = value;
    dispatchOnChange({ changed: "shape", key, value });
    return true;
  },
  deleteProperty(target, key) {
    delete target[key];
    dispatchOnChange({ changed: "shape", key, deleted: true });
    return true;
  },
});

// Example: Listen for onChange event
canvas.addEventListener("onChange", (event) => {
  console.log("Diagram changed:", event);
  // Example: Save changes to server or update UI
});

// Load diagram by link
let url = new URL(window.location.href);
if (url.searchParams.get("k")) {
  uiDisable(true);
  srvGet(url.searchParams.get("k")).then((appData) => {
    url.searchParams.delete("k");
    if (wrappedDeserialize(canvas, appData)) {
      tipShow(false);
    }
    history.replaceState(null, null, url);
    uiDisable(false);
    url = null;
  });
} else {
  url = null;
}
