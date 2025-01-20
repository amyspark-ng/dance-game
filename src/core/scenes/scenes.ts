import { Transition } from "./transitions/transition";

const sceneDefinitions: Record<string, (state: KaplayState) => void> = {};

export class KaplayState {
	static scene(name: string, sceneDef: (state: KaplayState) => void) {
		sceneDefinitions[name] = sceneDef;
	}

	static switchState(state: KaplayState, transition?: Transition) {
		if (transition) transition.action(state);
		else {
			go(state.sceneName, state);
			getTreeRoot().trigger("scene_change", state.sceneName);
		}
	}

	static goScene(state: KaplayState) {
		getTreeRoot().trigger("scene_change", name);
		go(state.sceneName, state);
	}

	/** The name of the scene to go to when the transition is over */
	sceneName: string;

	static changeScene(action: (sceneName: string) => void) {
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
