import { setupCamera } from "./plugins/features/camera"
import { setupCursor } from "./plugins/features/gameCursor"
import { drag } from "./plugins/features/drag"
import { setupSoundtray } from "./plugins/features/soundtray"
import { GameSave } from "./gamesave"
import { setupLayers } from "./layers"
import { getSong, loadAssets, loadingScreen } from "./loader"
import { goScene, setupScenes } from "./scenes"
import { setupWatch } from "./plugins/features/watcher"
import { utils } from "../utils"
import { paramsChartEditor } from "../play/chartEditor/chartEditorBackend"
import { getCurrent, WebviewWindow } from "@tauri-apps/api/window"

/** Class that handles some variables related to the game as a product */
export class PRODUCT {
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

export function INITIAL_SCENE() {
	// goScene("title")
	// goScene("menu", { index: 0 })
	
	// goScene("game", { song: getSong("bopeebo"), dancer: "gru"} as paramsGameScene)
	
	// goScene("songselect", { index: 0 } as paramsSongSelect)
	
	goScene("charteditor", { song: getSong("unholy-blight") } as paramsChartEditor )
	
	// goScene("results", { GameState: {
	// 	song: getSong("bopeebo"),
	// 	params: { dancer: "gru" },
	// 	tally: Scoring.tally.random()
	// }} as paramsResultsScene )
}

export async function initGame() {
	document.title = PRODUCT.NAME
	utils.runInDesktop(() => {
		appWindow = getCurrent()
		appWindow.setTitle(PRODUCT.name)
	})
	
	setCursor("none")
	
	GameSave.load()
	onLoading((progress:number) => loadingScreen(progress))
	await loadAssets()
	
	onLoad(() => {
		// sets up a bunch of stuff
		setupLayers(); // sets up layers before for any object
		setupScenes(); // sets up the scenes for objects
		setupCursor() // sets up the cursor
		setupCamera(); // sets up the camera
		setupSoundtray(); // sets up the soundtray
		setupWatch(); // sets up the watcher
		volume(GameSave.sound.masterVolume)
	
		console.log(`${PRODUCT.AUTHOR}.${PRODUCT.NAME} v: ${PRODUCT.VERSION}`)
		
		// determins the scene the scene
		if (PRODUCT.FEATURE_FOCUS) {
			if (isFocused()) INITIAL_SCENE()
			else goScene("focus")
		}
	
		else {
			INITIAL_SCENE()
		}
	
		setGravity(1000)
		globalThis.GameSave = GameSave
	})
	
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
}