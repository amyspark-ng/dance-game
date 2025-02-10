import { getFocused } from "../../../ui/objects/uiElementComp";
import { EditorState } from "../EditorState";

export const editorShortcuts = () => {
	const ChartState = EditorState.instance;
	// if shortcuts disabled return (don't do anything)
	if (getFocused()) return;

	// #region SCROLLING
	let stepsToScroll = 0;

	// scroll up
	if (isKeyPressedRepeat("w")) {
		if (!ChartState.paused) ChartState.paused = true;
		if (isKeyDown("shift")) stepsToScroll = -5;
		else stepsToScroll = -1;
		ChartState.scrollToStep(ChartState.scrollStep + stepsToScroll);
	}
	// scroll down
	else if (isKeyPressedRepeat("s")) {
		if (!ChartState.paused) ChartState.paused = true;
		if (isKeyDown("shift")) stepsToScroll = 5;
		else stepsToScroll = 1;
		ChartState.scrollToStep(ChartState.scrollStep + stepsToScroll);
	}

	// scroll left nah just messing with you
	// floor to closest beat
	if (isKeyPressedRepeat("a") && !isKeyDown("control")) {
		if (!ChartState.paused) ChartState.paused = true;
		ChartState.scrollToStep(ChartState.scrollStep - ChartState.conductor.stepsPerBeat);
	}
	// ceil to closest beat
	else if (isKeyPressedRepeat("d") && !isKeyDown("control")) {
		if (!ChartState.paused) ChartState.paused = true;
		ChartState.scrollToStep(ChartState.scrollStep + ChartState.conductor.stepsPerBeat);
	}
	// #endregion SCROLLING

	// #region MOVES
	if (isKeyPressed("1")) ChartState.currentMove = "left";
	else if (isKeyPressed("2")) ChartState.currentMove = "down";
	else if (isKeyPressed("3")) ChartState.currentMove = "up";
	else if (isKeyPressed("4")) ChartState.currentMove = "right";
	// #endregion MOVES

	// #region COMMANDS
	if (isKeyPressed("backspace")) EditorState.commands.DeleteMultiple();

	// all the control commands
	if (!isKeyDown("control")) return;
	else if (isKeyDown("shift") && isKeyPressed("s")) EditorState.commands.SaveChart();
	else if (isKeyDown("shift") && isKeyPressed("f")) EditorState.commands.InvertNotes();
	else if (isKeyPressed("n")) EditorState.commands.NewChart();
	else if (isKeyPressed("o")) EditorState.commands.OpenChart();
	else if (isKeyPressed("q")) EditorState.commands.Exit();
	else if (isKeyPressed("a")) EditorState.commands.SelectAll();
	else if (isKeyPressed("d")) EditorState.commands.DeselectAll();
	else if (isKeyPressed("i")) EditorState.commands.InvertSelection();
	else if (isKeyPressed("c")) EditorState.commands.Copy();
	else if (isKeyPressed("x")) EditorState.commands.Cut();
	else if (isKeyPressed("v")) EditorState.commands.Paste();
	else if (isKeyPressedRepeat("z")) EditorState.commands.Undo();
	else if (isKeyPressedRepeat("y")) EditorState.commands.Redo();
	// #endregion COMMANDS
};
