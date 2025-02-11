import { GameSave } from "../../../core/save";
import { switchScene } from "../../../core/scenes/KaplayState";
import { getFocused } from "../../../ui/objects/uiElementComp";
import { GameState } from "../../GameState";
import { EditorState } from "../EditorState";

export function keyboardControls() {
	const state = EditorState.instance;

	// Send you to the game
	onKeyPress("enter", async () => {
		if (!state.inputEnabled) return;
		if (getFocused()) return;

		state.inputEnabled = false;
		state.paused = true;

		// transition to scene normally
		switchScene(GameState, { fromEditor: true, song: state.song, seekTime: state.conductor.time });
	});

	// Pausing unpausing behaviour
	onKeyPress("space", () => {
		if (!state.inputEnabled) return;
		if (getFocused()) return;

		state.paused = !state.paused;

		if (state.paused == false) {
			state.conductor.audioPlay.seek(state.conductor.time);
		}
	});

	onKeyPress("escape", () => {
		// openExitDialog();
	});
}
