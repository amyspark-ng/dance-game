import { _GameSave, GameSave } from "../../../core/save";
import { KaplayState } from "../../../core/scenes/KaplayState";
import { StateMenu } from "../MenuScene";

export class StateOptions extends KaplayState {
	constructor() {
		super("options");
	}
}

KaplayState.scene("options", (OptionsState: StateOptions) => {
	setBackground(BLUE.lighten(30));

	add([
		text("OPTIONS", { size: 80 }),
		anchor("center"),
		pos(center().x, 70),
	]);

	onSceneLeave(() => {
		// just in case
		GameSave.save();
	});

	onKeyPress("escape", () => KaplayState.switchState(new StateMenu("options")));
});
