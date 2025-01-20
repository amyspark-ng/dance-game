import { KaplayState } from "../KaplayState";

/** Class */
export class Transition {
	static onTransitionStart(action: (transitionName: string) => void) {
		return getTreeRoot().on("transition_start", action);
	}

	static onTransitionEnd(action: (transitionName: string) => void) {
		return getTreeRoot().on("transition_start", action);
	}

	static trigger(a: "start" | "end") {
		return getTreeRoot().trigger("transition_" + a, this.name);
	}

	action: (state: KaplayState) => void;

	name: string;

	finish() {
		Transition.trigger("end");
	}

	constructor(name: string, action: (state: KaplayState) => void) {
		this.name = name;
		this.action = action;
		Transition.trigger("start");
	}
}
