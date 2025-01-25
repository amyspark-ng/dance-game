import { getCurrent, WebviewWindow } from "@tauri-apps/api/window";
import { StateChart } from "../play/editor/EditorState";
import { StateGame } from "../play/PlayState";
import { FocusState } from "../ui/FocusScene";
import { StateDancerSelect } from "../ui/menu/songselect/dancerselect/DancerSelectScene";
import { StateSongSelect } from "../ui/menu/songselect/SongSelectScene";
import { StateTitle } from "../ui/TitleScene";
import { utils } from "../utils";
import { setupCamera } from "./camera";
import { setupCursor } from "./cursor";
import { curDraggin } from "./drag";
import { loadAssets, loadingScreen } from "./loader";
import { GameSave } from "./save";
import { KaplayState, setupScenes } from "./scenes/KaplayState";
import { Sound } from "./sound";
import { CustomSoundTray } from "./soundtray";

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
	Sound.changeVolume(GameSave.volume);
	new CustomSoundTray(["+"], ["-"], false);
	setupScenes();
	setupCursor();
	setupCamera();

	console.log(`${GAME.AUTHOR}.${GAME.NAME} v: ${GAME.VERSION}`);

	if (GAME.FEATURE_FOCUS) {
		if (isFocused()) INITIAL_SCENE();
		else KaplayState.switchState(new FocusState());
	}
	else {
		INITIAL_SCENE();
	}
});

utils.runInDesktop(() => {
	// if (GameSave.fullscreen) appWindow.setFullscreen(GameSave.fullscreen);
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
	// if (document.fullscreenElement) GameSave.fullscreen = true;
	// else GameSave.fullscreen = false;
});

export function INITIAL_SCENE() {
	// KaplayState.switchState(new StateTitle());
	KaplayState.switchState(new StateDancerSelect());
	// KaplayState.switchState(
	// 	new StateChart({ dancer: GameSave.dancer, playbackSpeed: 1, seekTime: 1, song: getSong("bopeebo") }),
	// );
	// KaplayState.switchState(
	// 	new StateGame({
	// 		dancerName: GameSave.dancer,
	// 		song: Content.getSongByName("bopeebo"),
	// 	}),
	// );
	// KaplayState.switchState(new StateSongSelect(0));
	// KaplayState.switchState(new StateChart({ song: Content.getSongByName("bopeebo") }));
}
