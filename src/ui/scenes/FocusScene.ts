import { INITIAL_SCENE } from "../../core/init";
import { KaplayState } from "../../core/scenes/KaplayState";

export class StateFocus extends KaplayState {
}

KaplayState.scene("StateFocus", () => {
	setBackground(BLACK.lighten(50));

	add([
		text("CLICK TO FOCUS"),
	]);

	onClick(() => {
		INITIAL_SCENE();
	});
});
