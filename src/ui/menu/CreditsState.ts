import { IScene, switchScene } from "../../core/scenes/KaplayState";
import { MenuState } from "./MenuState";

export class CreditsState implements IScene {
	scene(this: CreditsState): void {
		add([
			text("GAME MADE BY\nme lol"),
			anchor("center"),
			pos(center()),
		]);

		onKeyPress("escape", () => switchScene(MenuState, "credits"));
	}
}
