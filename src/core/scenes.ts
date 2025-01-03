import { ChartEditorScene } from "../play/chartEditor/ChartEditorScene";
import { GameScene } from "../play/GameScene";
import { CharSelectScene } from "../play/ui/CharSelectScene";
import { DeathScene } from "../play/ui/DeathScene";
import { ResultsScene } from "../play/ui/ResultsScene";
import { FocusScene } from "../ui/FocusScene";
import { MenuScene } from "../ui/menu/MenuScene";
import { OptionsScene } from "../ui/menu/options/OptionsScene";
import { SongSelectScene } from "../ui/SongSelectScene";
import { TitleScene } from "../ui/TitleScene";

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
	"options": OptionsScene,
};

/** Custom type for scene names */
export type sceneNameType = keyof typeof allGameScenes;

export type newSceneOpts = {
	sceneName: sceneNameType;
	params?: any;
};

/**
 * Receives a transition function so it can call it and transition from one scene to another
 * @param transitionFunction The transition function
 * @param sceneName The typed name of the scene
 * @param params Extra params you'd want to add (please be an object)
 */
export function transitionToScene(
	transitionFunction: (sceneName: sceneNameType, params: any) => void,
	sceneName: sceneNameType,
	params: any,
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
	go(sceneName, params);
}

/** Is the function that calls all the scene definitions, thus loading them */
export function setupScenes() {
	Object.values(allGameScenes).forEach(sceneDefinition => sceneDefinition());
}
