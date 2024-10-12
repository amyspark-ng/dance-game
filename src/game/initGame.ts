import { DEBUG, DFEATURE_FOCUS, PRODUCT_AUTHOR, PRODUCT_NAME, PRODUCT_VERSION, STARTING_SCENE } from "../main"
import { setupCamera } from "../plugins/features/camera"
import { setupCursor } from "../plugins/features/gameCursor"
import { drag } from "../plugins/features/drag"
import { setupSoundtray } from "../plugins/features/soundtray"
import { GameSave } from "./gamesave"
import { setupLayers } from "./layers"
import { loadAssets, loadingScreen } from "./loader"
import { goScene, setupScenes } from "./scenes"
import { setupEventHandler } from "./events"

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
		setupEventHandler(); // sets up the event handler
		
		console.log(`${PRODUCT_AUTHOR}.${PRODUCT_NAME} v: ${PRODUCT_VERSION}`)
		
		// determins the scene the scene
		if (DFEATURE_FOCUS) {
			if (isFocused()) go(`${STARTING_SCENE}`)
			else goScene("focus", null)
		}

		else go(`${STARTING_SCENE}`)
	})
	
	// for drag
	document.getElementById("kanva").addEventListener("mouseout", () => {
		// all of the objects that are draggable have this function
		if (drag.getCurDragging()) drag.getCurDragging().drop()
	}, false);
}