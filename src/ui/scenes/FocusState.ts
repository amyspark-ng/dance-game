import { cam } from "../../core/camera";
import { INITIAL_SCENE } from "../../core/init";
import { IScene } from "../../core/scenes/KaplayState";

export class FocusState implements IScene {
	scene() {
		setBackground(BLACK.lighten(50));

		add([
			text("CLICK TO FOCUS"),
		]);

		onClick(() => {
			INITIAL_SCENE();
		});
	}
}
