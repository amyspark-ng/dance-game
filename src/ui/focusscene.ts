import { INITIAL_SCENE } from "../core/initGame";
import { KaplayState } from "../core/scenes";

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
