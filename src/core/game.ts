import { WebviewWindow } from "@tauri-apps/api/window";

/** Class that handles some variables related to the game as a product */
export class GAME {
	static DEBUG = true;
	static AUTHOR = "amyspark-ng";
	static NAME = "dance-game";
	static VERSION = "0.0.0";

	static SAVE_NAME = `${this.AUTHOR}.${this.NAME}`;

	// FEATURES
	/** Wheter the game should get you to the focus scene if the canvas isn't focused at start */
	static FEATURE_FOCUS = true;
}

/** The window (in case you're using desktop) */
export let appWindow: WebviewWindow = null;
export function setAppWindow(value: WebviewWindow) {
	appWindow = value;
}
