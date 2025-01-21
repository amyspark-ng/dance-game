import { _GameSave, GameSave } from "../../../core/save";
import { KaplayState } from "../../../core/scenes/KaplayState";

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
});
