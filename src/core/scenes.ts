import { ChartEditorScene } from "../play/chartEditor/chartEditor";
import { GameScene } from "../play/gamescene";
import { CharSelectScene } from "../play/ui/chartSelectScene";
import { DeathScene } from "../play/ui/deathScene";
import { ResultsScene } from "../play/ui/resultsScene";
import { FocusScene } from "../ui/focusscene";
import { MenuScene } from "../ui/menu/menuScene";
import { SongSelectScene } from "../ui/songselectscene";
import { TitleScene } from "../ui/titlescene";

/** Object containing the name of all game scenes */
const allGameScenes = {
	"focus": FocusScene,
	"title": TitleScene,
	"game": GameScene,
	"menu": MenuScene,
	"results": ResultsScene,
	"songselect": SongSelectScene,
	"charselect": CharSelectScene,
	"death": DeathScene,
	"charteditor": ChartEditorScene,
}

/** Custom type for scene names */
export type sceneNameType = keyof typeof allGameScenes

export type newSceneOpts = {
	sceneName: sceneNameType,
	params?: any,
}

/**
 * Receives a transition function so it can call it and transition from one scene to another
 * @param transitionFunction The transition function
 * @param sceneName The typed name of the scene
 * @param params Extra params you'd want to add (please be an object)
 */
export function transitionToScene(
	transitionFunction: (sceneName: sceneNameType, params: any) => void,
	sceneName: sceneNameType,
	params: any
) {
	// Call the passed transition function with the provided scene name and params
	transitionFunction(sceneName, params);
}

/**
 * Just like a regular go() but with the scene name typed
 * @param sceneName The typed name of the scene
 * @param params Extra params you'd want to add (please be an object)
 */
export function goScene(sceneName: sceneNameType, params?: any) {
	go(sceneName, params)
}

/** Is the function that calls all the scene definitions, thus loading them */
export function setupScenes() {
	Object.values(allGameScenes).forEach(sceneDefinition => sceneDefinition())
}