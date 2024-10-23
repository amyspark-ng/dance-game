import { DFEATURE_FOCUS, PRODUCT_AUTHOR, PRODUCT_NAME, PRODUCT_VERSION } from "../main"
import { setupCamera } from "./plugins/features/camera"
import { setupCursor } from "./plugins/features/gameCursor"
import { drag } from "./plugins/features/drag"
import { setupSoundtray } from "./plugins/features/soundtray"
import { GameSave } from "./gamesave"
import { setupLayers } from "./layers"
import { getSong, loadAssets, loadingScreen, songCharts } from "./loader"
import { goScene, setupScenes } from "./scenes"
import { setupWatch } from "./plugins/features/watcher"
import { paramsGameScene } from "../play/playstate"
import { paramsSongSelect } from "../ui/songSelectScene"

export function INITIAL_SCENE() {
	// goScene("game", { song: getSong("bopeebo"), dancer: "gru"} as paramsGameScene)
	goScene("songselect", { index: 0 } as paramsSongSelect)
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
			if (isFocused()) INITIAL_SCENE()
			else goScene("focus")
		}

		else {
			INITIAL_SCENE()
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
}