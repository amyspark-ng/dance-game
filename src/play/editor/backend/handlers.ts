import { getFocused } from "../../../ui/objects/uiElementComp";
import { StateChart } from "../EditorState";

export const editorShortcuts = () => {
	const ChartState = StateChart.instance;
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
	if (isKeyPressed("backspace")) StateChart.commands.DeleteMultiple();

	// all the control commands
	if (!isKeyDown("control")) return;
	else if (isKeyDown("shift") && isKeyPressed("s")) StateChart.commands.SaveChart();
	else if (isKeyDown("shift") && isKeyPressed("f")) StateChart.commands.InvertNotes();
	else if (isKeyPressed("n")) StateChart.commands.NewChart();
	else if (isKeyPressed("o")) StateChart.commands.OpenChart();
	else if (isKeyPressed("q")) StateChart.commands.Exit();
	else if (isKeyPressed("a")) StateChart.commands.SelectAll();
	else if (isKeyPressed("d")) StateChart.commands.DeselectAll();
	else if (isKeyPressed("i")) StateChart.commands.InvertSelection();
	else if (isKeyPressed("c")) StateChart.commands.Copy();
	else if (isKeyPressed("x")) StateChart.commands.Cut();
	else if (isKeyPressed("v")) StateChart.commands.Paste();
	else if (isKeyPressedRepeat("z")) StateChart.commands.Undo();
	else if (isKeyPressedRepeat("y")) StateChart.commands.Redo();
	// #endregion COMMANDS
};
