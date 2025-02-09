import { getCurrent } from "@tauri-apps/api/window";
import { configure, InMemory } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";
import { getSongByName, SongContent } from "../data/song";
import { StateChart } from "../play/editor/EditorState";
import { StateGame } from "../play/PlayState";
import { StateOptions } from "../ui/menu/options/optionsScene";
import { StateSongSelect } from "../ui/menu/songselect/SongSelectScene";
import { StateFocus } from "../ui/scenes/FocusScene";
import { StateTitle } from "../ui/scenes/TitleScene";
import { utils } from "../utils";
import { setupCamera } from "./camera";
import { setupCursor } from "./cursor";
import { curDraggin } from "./drag";
import { appWindow, GAME, setAppWindow } from "./game";
import { loadAssets, loadingScreen } from "./loader";
import { GameSave } from "./save";
import { KaplayState, setupScenes } from "./scenes/KaplayState";
import { Sound } from "./sound";
import { CustomSoundTray } from "./soundtray";

document.title = GAME.NAME;
utils.runInDesktop(() => {
	setAppWindow(getCurrent());
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
		else KaplayState.switchState(StateFocus);
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
	// KaplayState.switchState(StateTitle);
	KaplayState.switchState(StateOptions);
	// KaplayState.switchState(StateSongSelect, 0);
	// KaplayState.switchState(StateChart, { song: SongContent.getByName("Bopeebo") });
	// KaplayState.switchState(StateGame, { song: SongContent.getByName("Bopeebo") });
}
