const sceneDefinitions: Record<string, (state: KaplayState) => void> = {};

/** Type for transition function */
export type StateSwitchTransition = (state: KaplayState) => void;

export class KaplayState {
	/** The name of the scene to go to when the transition is over */
	sceneName: string;

	static scene(name: string, sceneDef: (state: KaplayState) => void) {
		sceneDefinitions[name] = sceneDef;
	}

	static switchState(state: KaplayState, transition?: StateSwitchTransition) {
		// console.log("going to scene: " + state.sceneName);
		if (transition) transition(state);
		else go(state.sceneName, state);
	}
	constructor(sceneName: string) {
		this.sceneName = sceneName;
	}
}

/** Is the function that calls all the scene definitions, thus loading them */
export function setupScenes() {
	Object.keys(sceneDefinitions).forEach((sceneName) => {
		scene(sceneName, sceneDefinitions[sceneName]);
		// console.log("loaded: " + sceneName);
	});
}
