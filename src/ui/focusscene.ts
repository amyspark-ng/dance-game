import { INITIAL_SCENE } from "../core/init";
import { KaplayState } from "../core/scenes/KaplayState";

export class FocusState extends KaplayState {
	constructor() {
		super("focus");
	}
}

KaplayState.scene("focus", (FocusState: FocusState) => {
	setBackground(BLACK.lighten(50));

	add([
		text("CLICK TO FOCUS"),
	]);

	onClick(() => {
		INITIAL_SCENE();
	});
});
