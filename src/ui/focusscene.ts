import { INITIAL_SCENE } from "../core/initGame";
import { goScene } from "../core/scenes";

export function FocusScene() {
	scene("focus", () => {
		setBackground(BLACK.lighten(50));

		add([
			text("CLICK TO FOCUS"),
		]);

		onClick(() => {
			INITIAL_SCENE();
		});
	});
}
