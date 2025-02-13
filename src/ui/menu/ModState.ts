import { IScene, switchScene } from "../../core/scenes/KaplayState";
import { MenuState } from "./MenuState";

export class ModsState implements IScene {
	scene(instance: ModsState): void {
		onKeyPress("escape", () => {
			switchScene(MenuState, "mods");
		});
	}
}
