import { getCurrent } from "@tauri-apps/api/window";
import { configure, InMemory } from "@zenfs/core";
import { IndexedDB, WebStorage } from "@zenfs/dom";
import { SongContent } from "../data/song";
import { EditorState } from "../play/editor/EditorState";
import { GameState } from "../play/GameState";
import { MenuState } from "../ui/menu/MenuState";
import { OptionsState } from "../ui/menu/options/OptionsState";
import { ScoresState } from "../ui/menu/ScoresState";
import { SongSelectState } from "../ui/menu/songselect/SongSelectState";
import { FocusState } from "../ui/scenes/FocusState";
import { TitleState } from "../ui/scenes/TitleState";
import { utils } from "../utils";
import { setupCamera } from "./camera";
import { setupCursor } from "./cursor";
import { curDraggin } from "./drag";
import { appWindow, GAME, setAppWindow } from "./game";
import { loadAssets, loadingScreen } from "./loader";
import { GameSave } from "./save";
import { switchScene } from "./scenes/KaplayState";
import { Sound } from "./sound";
import { CustomSoundTray } from "./soundtray";

// "/home": { backend: WebStorage, storage: localStorage },
configure({
	mounts: {
		"/tmp": InMemory,
		"/home": IndexedDB,
	},
	addDevices: true,
});

console.log(`${GAME.AUTHOR}.${GAME.NAME} v: ${GAME.VERSION}`);
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
	new CustomSoundTray([GameSave.soundUpKey], [GameSave.soundDownKey], false);
	setupCursor();
	setupCamera();

	if (GAME.FEATURE_FOCUS) {
		if (isFocused()) INITIAL_SCENE();
		else switchScene(FocusState);
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

// prevent ctrl + f weirdness
document.addEventListener("keydown", function(e) {
	if (e.key === "f" && (navigator.userAgent.includes("Mac") ? e.metaKey : e.ctrlKey)) {
		e.preventDefault();
	}
}, false);

// update fullscreen
document.addEventListener("fullscreenchange", (event) => {
	// if (document.fullscreenElement) GameSave.fullscreen = true;
	// else GameSave.fullscreen = false;
});

export function INITIAL_SCENE() {
	switchScene(MenuState, "songs");
	// switchScene(ScoresState);
	// switchScene(EditorState, { song: SongContent.getByName("Bopeebo") });
	// switchScene(GameState, { song: SongContent.getByName("Bopeebo") });
}
