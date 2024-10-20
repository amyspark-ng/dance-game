import { DFEATURE_FOCUS, PRODUCT_AUTHOR, PRODUCT_NAME, PRODUCT_VERSION } from "../main"
import { setupCamera } from "../plugins/features/camera"
import { setupCursor } from "../plugins/features/gameCursor"
import { drag } from "../plugins/features/drag"
import { setupSoundtray } from "../plugins/features/soundtray"
import { GameSave } from "./gamesave"
import { setupLayers } from "./layers"
import { loadAssets, loadingScreen, songCharts } from "./loader"
import { goScene, setupScenes } from "./scenes"
import { setupWatch } from "../plugins/features/watcher"
import { chartEditorParams } from "../debug/charteditorscene"
import { GameSceneParams } from "../play/gamescene"

export function goGameScene() {
	goScene("game", { song: songCharts["bopeebo"] } as GameSceneParams)
}

export function goChartEditor() {
	goScene("charteditor", { song: songCharts["bopeebo"] } as chartEditorParams)
}

/** Sets up the game */
export function initGame() {
	document.title = PRODUCT_NAME

	setCursor("none")

	loadAssets()
	onLoading((progress:number) => loadingScreen(progress))
	onLoad(() => {
		GameSave.load()
		
		// sets up a bunch of stuff
		setupLayers(); // sets up layers before for any object
		setupScenes(); // sets up the scenes for objects
		setupCursor() // sets up the cursor
		setupCamera(); // sets up the camera
		setupSoundtray(); // sets up the soundtray
		setupWatch(); // sets up the watcher

		console.log(`${PRODUCT_AUTHOR}.${PRODUCT_NAME} v: ${PRODUCT_VERSION}`)
		
		// determins the scene the scene
		if (DFEATURE_FOCUS) {
			if (isFocused()) goGameScene()
			else goScene("focus")
		}

		else {
			// goChartEditor()
			goGameScene()
		}
	
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
}