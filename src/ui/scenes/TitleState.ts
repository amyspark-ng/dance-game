import { appWindow } from "@tauri-apps/api/window";
import { IScene, switchScene } from "../../core/scenes/KaplayState";
import { utils } from "../../utils";
import { MenuState } from "../menu/MenuState";

// hopefully this scene will have some way of adding really cool scrollable texts
// with some jokes and easter eggs and stuff yeah :)
export class TitleState implements IScene {
	scene(this: this): void {
		setBackground(BLUE.lighten(30));

		let inDesktop = false;
		utils.runInDesktop(() => inDesktop = true);
		let inputEnabled = true;

		const title = add([
			text("Dance Game!!!!!", {
				size: 80,
				align: "center",
			}),
			anchor("center"),
			pos(center()),
		]);

		onKeyPress("escape", () => {
			if (inDesktop) appWindow.close();
			else if (get("joke").length < 1) {
				inputEnabled = false;
				const jokething = add([
					rect(width(), height()),
					pos(center()),
					color(BLACK),
					anchor("center"),
					"joke",
				]);

				wait(2, () => {
					inputEnabled = true;
					jokething.destroy();
					debug.log("sike");
				});
			}
		});

		onKeyPress("enter", () => {
			if (!inputEnabled) return;
			switchScene(MenuState, "songs");
		});
	}

	constructor() {
	}
}
