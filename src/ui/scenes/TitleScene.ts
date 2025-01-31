import { appWindow } from "@tauri-apps/api/window";
import { KaplayState } from "../../core/scenes/KaplayState";
import { utils } from "../../utils";
import { StateMenu } from "../menu/MenuScene";

export class StateTitle extends KaplayState {
	constructor() {
		super();
	}
}

// hopefully this scene will have some way of adding really cool scrollable texts
// with some jokes and easter eggs and stuff yeah :)
KaplayState.scene("StateTitle", () => {
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
		KaplayState.switchState(StateMenu, "songs");
	});
});
