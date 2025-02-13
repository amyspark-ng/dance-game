import { IScene, switchScene } from "../../core/scenes/KaplayState";
import { MenuState } from "./MenuState";

export class ScoresState implements IScene {
	scene(instance: IScene): void {
		onKeyPress("escape", () => {
			switchScene(MenuState, "scores");
		});
	}
}
