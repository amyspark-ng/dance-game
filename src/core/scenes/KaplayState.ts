import { Transition } from "./transitions/Transition";

const sceneDefinitions: Record<string, (state: KaplayState) => void> = {};

/** Class to handle the scenes/states of the game
 *
 * To make a new scene you'd have to
 * 1. Make a new state class and extend this one
 * ```ts
 * class StateGame extends KaplayState {
 * 		score: number = 0
 * 		constructor(startingScore: number = 0) {
 * 			super("game")
 * 			this.score = startingScore
 * 		}
 * }
 * ```
 *
 * 2. Then you have to define the actual scene, doing something like this
 * ```ts
 * KaplayState.scene("game", (GameState: StateGame) => {
 * 		GameState.score = 100
 * })
 * ```
 *
 * 3. And to switch from any scene to that state you'd have to do
 * ```ts
 * KaplayState.switchState(new StateGame(100))
 * ```
 *
 * Cool right?
 */
export class KaplayState {
	static scene(name: string, sceneDef: (state: KaplayState) => void) {
		sceneDefinitions[name] = sceneDef;
	}

	/** Switch to a different state
	 * @param state The new state
	 * @param transition Wheter to use a transition
	 */
	static switchState(state: KaplayState, transition?: Transition) {
		if (transition) transition.action(state);
		else {
			KaplayState.goScene(state);
		}
	}

	/** Go to a scene directly */
	static goScene(state: KaplayState) {
		getTreeRoot().trigger("scene_change", name);
		go(state.sceneName, state);
	}

	/** The name of the scene to go to when the transition is over */
	sceneName: string;

	/** Runs when the scene is changed
	 * @param action Void function that has the name of the new scene i think
	 */
	static onSceneChange(action: (sceneName: string) => void) {
		return getTreeRoot().on("scene_change", action);
	}

	constructor(sceneName: string) {
		this.sceneName = sceneName;
	}
}

/** Is the function that calls all the scene definitions, thus loading them */
export function setupScenes() {
	Object.keys(sceneDefinitions).forEach((sceneName) => {
		scene(sceneName, sceneDefinitions[sceneName]);
	});
}
