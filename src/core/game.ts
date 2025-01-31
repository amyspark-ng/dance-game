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

// export const request = indexedDB.open("database");
// let db: EventTarget = null;
// export let songsDB: IDBObjectStore = null;

// request.onupgradeneeded = function(event) {
// 	let db = event.target;
// 	let objectStore = db.createObjectStore("myObjectStore", { keyPath: "id" });
// 	objectStore.createIndex("nameIndex", "name", { unique: false });
// };

// request.onsuccess = function(event) {
// 	// @ts-ignore
// 	db = event.target;
// 	const songs = db.createObjectSquare
// 	songsDB =
// 	// Database opened successfully
// };

// request.onerror = function(event) {
// 	throw new Error("Error while trying to load the request to song database" + event);
// 	// Error occurred while opening the database
// };
