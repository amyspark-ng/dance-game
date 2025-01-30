const sceneDefinitions: Record<string, (...args: any[]) => void> = {};
export type transitionFunction = (state: new(...args: any[]) => KaplayState, ...args: any[]) => void;

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
	/** Defines a scene to be loaded automatically
	 * @param name Must be THE SAME as the class that it's associated with
	 * @param params The params that are passed when entering this class (usually the arguments in the constructor)
	 */
	static scene(name: string, sceneDef: (...params: any[]) => void) {
		sceneDefinitions[name] = sceneDef;
	}

	/** Switch to a different state
	 * @param state The new state
	 * @param transition Wheter to use a transition
	 */
	static switchState<T extends new(...args) => KaplayState>(state: T, ...args: ConstructorParameters<T>);
	static switchState<T extends new(...args) => KaplayState>(state: T, transition: transitionFunction, ...args: ConstructorParameters<T>);
	static switchState<T extends new(...args) => KaplayState>(state: T, ...args: any[]) {
		let transition: transitionFunction | undefined;
		let constructorArgs: any[];

		// Check if first argument is a transition (string) or the constructor args
		if (typeof args[0] === "function") {
			transition = args[0];
			constructorArgs = args.slice(1);
		}
		else {
			constructorArgs = args;
		}

		if (transition) transition(state, ...constructorArgs);
		else KaplayState.goScene(state, ...constructorArgs);
	}

	/** Go to a scene directly */
	static goScene<T extends new(...args) => KaplayState>(state: T, ...args: any[]) {
		getTreeRoot().trigger("scene_change", state.name);
		go(state.name, ...args);
	}

	/** Runs when the scene is changed
	 * @param action Void function that has the name of the new scene i think
	 */
	static onSceneChange(action: (sceneName: string) => void) {
		return getTreeRoot().on("scene_change", action);
	}
}

/** Is the function that calls all the scene definitions, thus loading them */
export function setupScenes() {
	Object.keys(sceneDefinitions).forEach((sceneName) => {
		scene(sceneName, sceneDefinitions[sceneName]);
	});
}
