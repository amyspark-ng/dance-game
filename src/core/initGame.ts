import { getCurrent, WebviewWindow } from "@tauri-apps/api/window";
import { FileManager } from "../fileManaging";
import { paramsChartEditor } from "../play/chartEditor/EditorState";
import { paramsGameScene } from "../play/PlayState";
import { paramsSongSelect } from "../ui/SongSelectScene";
import { utils } from "../utils";
import { GameSave } from "./gamesave";
import { getSong, loadAssets, loadingScreen } from "./loader";
import { setupCamera } from "./plugins/features/camera";
import { curDraggin, drag } from "./plugins/features/drag";
import { gameCursor, setupCursor } from "./plugins/features/gameCursor";
import { updateMasterVolume } from "./plugins/features/sound";
import { setupSoundtray } from "./plugins/features/soundtray";
import { setupWatch } from "./plugins/features/watcher";
import { goScene, setupScenes } from "./scenes";

/** Class that handles some variables related to the game as a product */
export class GAME {
	static DEBUG = true;
	static AUTHOR = "amyspark-ng";
	static NAME = "dance-game";
	static VERSION = "0.0.0";

	static SAVE_NAME = `${this.AUTHOR}.${this.NAME}`;

	// FEATURES
	/** Wheter the game should get you to the focus scene if the canvas isn't focused at start */
	static FEATURE_FOCUS = false;
}

/** The window (in case you're using desktop) */
export let appWindow: WebviewWindow = null;
document.title = GAME.NAME;
utils.runInDesktop(() => {
	appWindow = getCurrent();
	appWindow.setTitle(GAME.NAME);
});

setCursor("none");
layers([
	"background",
	"cursor",
], "background");
setGravity(1000);

GameSave.load();
globalThis.GameSave = GameSave;
onLoading((progress: number) => loadingScreen(progress));
loadAssets();

onLoad(() => {
	setupScenes();
	setupCursor();
	setupCamera();
	setupSoundtray();
	updateMasterVolume();

	console.log(`${GAME.AUTHOR}.${GAME.NAME} v: ${GAME.VERSION}`);

	if (GAME.FEATURE_FOCUS) {
		if (isFocused()) INITIAL_SCENE();
		else goScene("focus");
	}
	else {
		INITIAL_SCENE();
	}
});

utils.runInDesktop(() => {
	if (GameSave.fullscreen) appWindow.setFullscreen(GameSave.fullscreen);
});

// for drag
document.getElementById("kanva").addEventListener("mouseout", () => {
	// all of the objects that are draggable have this function
	if (curDraggin) curDraggin.drop();
}, false);

// for middle click
document.body.onmousedown = function(e) {
	if (e.button == 1) {
		e.preventDefault();
		return false;
	}
};

// prevent ctrl + s weirdness
document.addEventListener("keydown", function(e) {
	if (e.key === "s" && (navigator.userAgent.includes("Mac") ? e.metaKey : e.ctrlKey)) {
		e.preventDefault();
	}
}, false);

// update fullscreen
document.addEventListener("fullscreenchange", (event) => {
	if (document.fullscreenElement) GameSave.fullscreen = true;
	else GameSave.fullscreen = false;
});

export function INITIAL_SCENE() {
	goScene("charteditor", { song: getSong("bopeebo") } as paramsChartEditor);
	// goScene("game", { song: getSong("bopeebo") } as paramsGameScene);
	// goScene("songselect", { index: 0 } as paramsSongSelect);
	// goScene("menu", { index: 0 });
}
