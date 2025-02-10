import { GameSave } from "../../../core/save";
import { switchScene } from "../../../core/scenes/KaplayState";
import { getFocused } from "../../../ui/objects/uiElementComp";
import { GameState } from "../../GameState";
import { EditorState } from "../EditorState";

export function keyboardControls() {
	const ChartState = EditorState.instance;

	// Send you to the game
	onKeyPress("enter", async () => {
		if (!ChartState.inputEnabled) return;
		if (getFocused()) return;

		ChartState.inputEnabled = false;
		ChartState.paused = true;

		// transition to scene normally
		switchScene(GameState, { fromEditor: true, song: ChartState.song, seekTime: ChartState.conductor.time });
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
