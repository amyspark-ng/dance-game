import { GameSave } from "../../../core/save";
import { KaplayState } from "../../../core/scenes/KaplayState";
import { getFocused } from "../../../ui/objects/uiElementComp";
import { StateGame } from "../../PlayState";
import { StateChart } from "../EditorState";

export function keyboardControls() {
	const ChartState = StateChart.instance;

	// Send you to the game
	onKeyPress("enter", async () => {
		if (!ChartState.inputEnabled) return;
		if (getFocused()) return;

		ChartState.inputEnabled = false;
		ChartState.paused = true;

		// transition to scene normally
		KaplayState.switchState(StateGame, { fromEditor: true, song: ChartState.song, seekTime: ChartState.conductor.time });
	});

	// Pausing unpausing behaviour
	onKeyPress("space", () => {
		if (!ChartState.inputEnabled) return;
		if (getFocused()) return;

		ChartState.paused = !ChartState.paused;

		if (ChartState.paused == false) {
			ChartState.conductor.audioPlay.seek(ChartState.conductor.time);
		}
	});

	onKeyPress("escape", () => {
		// openExitDialog();
	});
}
