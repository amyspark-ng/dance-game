import { GameScene } from "../play/gamescene";
import { FocusScene } from "../ui/focusscene";
import { TitleScene } from "../ui/titlescene";

/** Object containing the name of all game scenes */
const allGameScenes = {
	"focus": FocusScene,
	"title": TitleScene,
	"game": GameScene,
}

/** Custom type for scene names */
export type sceneNameType = keyof typeof allGameScenes

/**
 * Custom function to go to a scene
 * @param sceneName The name of the scene dictated by sceneNameType which is dictated by a list of all game scenes
 * @param transition The transition to go to the scene, can be null then it won't have transition
 */
export function goScene(sceneName: sceneNameType, transition?: (newName: sceneNameType) => void | null, ...args:any) {
	transition = transition ?? null
	if (transition != null) transition(sceneName)
	else go(sceneName, args)
}

/** Is the function that calls all the scene definitions, thus loading them */
export function setupScenes() {
	Object.values(allGameScenes).forEach(sceneDefinition => sceneDefinition())
}