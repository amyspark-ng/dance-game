import { setupCamera } from "./plugins/features/camera"
import { gameCursor, setupCursor } from "./plugins/features/gameCursor"
import { drag } from "./plugins/features/drag"
import { setupSoundtray } from "./plugins/features/soundtray"
import { GameSave } from "./gamesave"
import { getSong, loadAssets, loadingScreen } from "./loader"
import { goScene, setupScenes } from "./scenes"
import { setupWatch } from "./plugins/features/watcher"
import { utils } from "../utils"
import { paramsChartEditor } from "../play/chartEditor/chartEditorBackend"
import { getCurrent, WebviewWindow } from "@tauri-apps/api/window"

/** Class that handles some variables related to the game as a product */
export class GAME {
	static DEBUG = true
	static AUTHOR = "amyspark-ng"
	static NAME = "dance-game"
	static VERSION = "0.0.0"
	
	static SAVE_NAME = `${this.AUTHOR}.${this.NAME}`

	// FEATURES
	/** Wheter the game should get you to the focus scene if the canvas isn't focused at start */
	static FEATURE_FOCUS = false
}

/** The window (in case you're using desktop) */
export let appWindow:WebviewWindow = null
document.title = GAME.NAME
utils.runInDesktop(() => {
	appWindow = getCurrent()
	appWindow.setTitle(GAME.NAME)
})

setCursor("none")
layers([
	"background",
	"cursor",
], "background")
setGravity(1000)

GameSave.load()
globalThis.GameSave = GameSave
onLoading((progress:number) => loadingScreen(progress))
await loadAssets()

setupScenes()
setupCursor()
setupCamera()
setupSoundtray()
volume(GameSave.sound.masterVolume)

console.log(`${GAME.AUTHOR}.${GAME.NAME} v: ${GAME.VERSION}`)

if (GAME.FEATURE_FOCUS) {
	if (isFocused()) INITIAL_SCENE()
	else goScene("focus")
}

else {
	INITIAL_SCENE()
}

// for drag
document.getElementById("kanva").addEventListener("mouseout", () => {
	// all of the objects that are draggable have this function
	if (drag.getCurDragging()) drag.getCurDragging().drop()
}, false);

// for middle click
document.body.onmousedown = function(e) {
	if(e.button == 1) {
		e.preventDefault();
		return false;
	}
}

// prevent ctrl + s weirdness
document.addEventListener("keydown", function(e) {
	if (e.key === 's' && (navigator.userAgent.includes('Mac') ? e.metaKey : e.ctrlKey)) {
		e.preventDefault();
	}
}, false);

// update fullscreen
document.addEventListener("fullscreenchange", (event) => {
	if (document.fullscreenElement) GameSave.fullscreen = true
	else GameSave.fullscreen = false
});

utils.runInDesktop(() => {
	if (GameSave.fullscreen) appWindow.setFullscreen(GameSave.fullscreen)
})

export function INITIAL_SCENE() {
	goScene("charteditor", { song: getSong("bopeebo") } as paramsChartEditor)
	// goScene("menu", { index: 0 })
}