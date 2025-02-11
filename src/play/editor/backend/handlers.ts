import { getFocused } from "../../../ui/objects/uiElementComp";
import { EditorState } from "../EditorState";
import { commands, coolRedo, coolUndo } from "./commands";

export const editorShortcuts = () => {
	const state = EditorState.instance;
	// if shortcuts disabled return (don't do anything)
	if (getFocused()) return;

	// #region SCROLLING
	let stepsToScroll = 0;

	// scroll up
	if (isKeyPressedRepeat("w")) {
		if (!state.paused) state.paused = true;
		if (isKeyDown("shift")) stepsToScroll = -5;
		else stepsToScroll = -1;
		state.scrollToStep(state.scrollStep + stepsToScroll);
	}
	// scroll down
	else if (isKeyPressedRepeat("s")) {
		if (!state.paused) state.paused = true;
		if (isKeyDown("shift")) stepsToScroll = 5;
		else stepsToScroll = 1;
		state.scrollToStep(state.scrollStep + stepsToScroll);
	}

	// scroll left nah just messing with you
	// floor to closest beat
	if (isKeyPressedRepeat("a") && !isKeyDown("control")) {
		if (!state.paused) state.paused = true;
		state.scrollToStep(state.scrollStep - state.conductor.stepsPerBeat);
	}
	// ceil to closest beat
	else if (isKeyPressedRepeat("d") && !isKeyDown("control")) {
		if (!state.paused) state.paused = true;
		state.scrollToStep(state.scrollStep + state.conductor.stepsPerBeat);
	}
	// #endregion SCROLLING

	// #region MOVES
	if (isKeyPressed("1")) state.currentMove = "left";
	else if (isKeyPressed("2")) state.currentMove = "down";
	else if (isKeyPressed("3")) state.currentMove = "up";
	else if (isKeyPressed("4")) state.currentMove = "right";
	// #endregion MOVES

	// #region COMMANDS
	if (isKeyPressed("backspace")) EditorState.instance.performCommand("DeleteStamps");

	// all the control commands
	if (!isKeyDown("control")) return;
	else if (isKeyDown("shift") && isKeyPressed("s")) EditorState.commands.SaveChart();
	else if (isKeyDown("shift") && isKeyPressed("f")) EditorState.instance.performCommand("FlipMoves");
	else if (isKeyPressed("n")) EditorState.commands.NewChart();
	else if (isKeyPressed("o")) EditorState.commands.OpenChart();
	else if (isKeyPressed("q")) EditorState.commands.Exit();
	else if (isKeyPressed("a")) EditorState.instance.performCommand("SelectStamps");
	else if (isKeyPressed("d")) EditorState.instance.performCommand("SelectStamps", []);
	else if (isKeyPressed("i")) EditorState.instance.performCommand("InvertSelection");
	else if (isKeyPressed("c")) EditorState.instance.performCommand("Copy");
	else if (isKeyPressed("x")) EditorState.instance.performCommand("Cut");
	else if (isKeyPressed("v")) EditorState.instance.performCommand("Paste");
	else if (isKeyPressedRepeat("z")) coolUndo();
	else if (isKeyPressedRepeat("y")) coolRedo();
	// #endregion COMMANDS
};
