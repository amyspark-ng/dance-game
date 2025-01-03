import { goScene, transitionToScene } from "../../core/scenes";
import { fadeOut } from "../../core/transitions/fadeOutTransition";
import { dialog_addCheckbox, dialog_addSlider, dialog_addTextbox, dialog_changeCover, dialog_changeSong, textboxOpt } from "../../ui/dialogs/dialogFields";
import { GameDialog } from "../../ui/dialogs/gameDialog";
import { utils } from "../../utils";
import { ChartEvent, SongContent } from "../song";
import { StateChart } from "./EditorState";

class TopButton {
	text: string;
	commands: { [key: string]: string; };
	constructor(text: string, commands: { [key: string]: string; }) {
		this.text = text;
		this.commands = commands;
	}
}

const topButtons = [
	new TopButton("file", {
		"newchart": "New chart (Ctrl + N)",
		"openchart": "Open chart (Ctrl + O)",
		"savechartas": "Download chart (Ctrl + Shift + S)",
		"exit": "Exit (Ctrl + Q)",
	}),
	new TopButton("edit", {
		"selectall": "Select all (Ctrl + A)",
		"deselect": "Deselect (Ctrl + D)",
		"delete": "Delete (Backspace)",
		"invertselection": "Invert selection (Ctrl + I)",
		"copy": "Copy (Ctrl + C)",
		"paste": "Paste (Ctrl + V)",
		"cut": "Cut (Ctrl + X)",
		"undo": "Undo (Ctrl + Z)",
		"redo": "Redo (Ctrl + Y)",
	}),
];

export function addEditorUI(ChartState: StateChart) {
	const TOP_HEIGHT = 35;
	const LEFT_PADDING = 10;
	const HEIGHT_OF_CHARACTER = 25;
	const WIDTH_OF_CHARACTER = formatText({ text: "A", size: HEIGHT_OF_CHARACTER / 2, font: "lambda" }).width;

	function addTopButton(classInstance: TopButton) {
		const button = add([
			text(classInstance.text, { size: HEIGHT_OF_CHARACTER, align: "left", font: "lambda" }),
			color(WHITE),
			anchor("topleft"),
			area(),
			pos(),
			z(1),
			"topbotton",
			"hover",
			{
				topButton: classInstance,
			},
		]);

		button.onClick(() => {
			contextMenu.updateState(button);
		});
		return button;
	}

	const contextMenu = add([
		rect(0, 0),
		pos(100, LEFT_PADDING),
		color(GameDialog.HEADER_COLOR),
		anchor("topleft"),
		{
			intendedHeight: 0,
			/** Runs when a top button has been clicked */
			updateState: null as (buttonObj: ReturnType<typeof addTopButton>) => void,
		},
	]);

	contextMenu.updateState = (buttonObj: ReturnType<typeof addTopButton>) => {
		contextMenu.intendedHeight = 0;
		contextMenu.removeAll();

		if (buttonObj == null) return;
		contextMenu.pos.x = buttonObj.pos.x;
		contextMenu.pos.y = TOP_HEIGHT;
		const topButton = buttonObj?.topButton;
		Object.keys(topButton.commands).forEach((commandKey, index) => {
			const textInCommand = topButton.commands[commandKey];
			const contextButton = contextMenu.add([
				text(textInCommand, { size: HEIGHT_OF_CHARACTER * 0.75, font: "lambda", align: "left" }),
				color(WHITE),
				anchor("left"),
				pos(),
				area(),
				"contextbutton",
				"hover",
			]);

			contextButton.pos.x = 5;
			contextButton.pos.y = 11 + index * 25;

			contextButton.onClick(() => {
				ChartState.actions[commandKey]();
				contextMenu.updateState(null);
			});
		});

		const longestCommand = Object.values(topButton.commands).reduce((a, b) => a.length > b.length ? a : b);
		contextMenu.width = WIDTH_OF_CHARACTER * longestCommand.length;
		contextMenu.intendedHeight = HEIGHT_OF_CHARACTER * Object.keys(topButton.commands).length;
	};

	contextMenu.onUpdate(() => {
		contextMenu.height = lerp(contextMenu.height, contextMenu.intendedHeight, 0.5);
		if (isMousePressed("left")) {
			if (!get("hover").some((obj) => obj.isHovering())) contextMenu.updateState(null);
		}
	});

	topButtons.forEach((topbutton, index) => {
		topbutton.text = topbutton.text.charAt(0).toUpperCase() + topbutton.text.slice(1);
		const button = addTopButton(topbutton);

		button.pos.y = 5;
		button.pos.x = LEFT_PADDING + 60 * index;
	});

	onDraw(() => {
		drawRect({
			pos: vec2(0, -1),
			width: width() * 1.1,
			height: TOP_HEIGHT,
			color: GameDialog.HEADER_COLOR,
			outline: { color: GameDialog.HEADER_COLOR.lighten(50), width: 1 },
		});
	});
}

/** Opens the dialog for the fields of the song in the chart editor */
export function openChartInfoDialog(ChartState: StateChart) {
	const newSong = new SongContent();
	const leftPadding = 10;

	const dialog = GameDialog.openDialog({
		width: 600,
		height: 450,
	});

	const textboxesOpts: textboxOpt[] = [
		{
			title: "Name",
			type: "string",
			length: 25,
			fallBackValue: newSong.manifest.name,
			startingValue: ChartState.song.manifest.name,
			dialog,
		},
		{
			title: "Artist",
			type: "string",
			length: 25,
			fallBackValue: newSong.manifest.artist,
			startingValue: ChartState.song.manifest.artist,
			dialog,
		},
		{
			title: "Charter",
			type: "string",
			length: 25,
			fallBackValue: newSong.manifest.charter,
			startingValue: ChartState.song.manifest.charter,
			dialog,
		},
		{
			title: "Starting BPM",
			type: "number",
			length: 3,
			fallBackValue: newSong.manifest.initial_bpm,
			startingValue: ChartState.song.manifest.initial_bpm,
			dialog,
		},
		{
			title: "Steps per beat (X/?)",
			type: "number",
			length: 2,
			fallBackValue: newSong.manifest.time_signature[0],
			startingValue: ChartState.conductor.stepsPerBeat,
			dialog,
		},
		{
			title: "Beats per measure (?/X)",
			type: "number",
			length: 2,
			fallBackValue: newSong.manifest.time_signature[1],
			startingValue: ChartState.conductor.beatsPerMeasure,
			dialog,
		},
	];

	const textboxes: ReturnType<typeof dialog_addTextbox>[] = [];

	const xPos = -(dialog.width / 2) + leftPadding;
	const ySpacing = 50;
	const initialYPos = -dialog.height / 2 + ySpacing / 1.5;
	textboxesOpts.forEach((opts, index) => {
		const optsWithPos = { ...opts, position: vec2(xPos, initialYPos + ySpacing * index) };
		const textbox = dialog_addTextbox(optsWithPos);

		textboxes[index] = textbox;
	});

	const scrollSpeedSlider = dialog_addSlider({
		title: "Scroll speed",
		dialog: dialog,
		position: vec2(xPos, textboxes[textboxes.length - 1].pos.y + ySpacing / 2),
		range: [1, 10],
		initialValue: ChartState.song.manifest.initial_scrollspeed,
	});

	const changeCover = dialog_changeCover({
		position: vec2(xPos, dialog.height / 2 - 75),
		dialog,
		ChartState,
	});

	const changeSong = dialog_changeSong({
		position: vec2(xPos, changeCover.pos.y + 45),
		dialog,
		ChartState,
	});

	dialog.onUpdate(() => {
		const nameTextbox = textboxes[0];
		if (nameTextbox.focus) ChartState.song.manifest.name = String(nameTextbox.value);
		else nameTextbox.value = ChartState.song.manifest.name;
		ChartState.song.manifest.chart_file = utils.kebabCase(ChartState.song.manifest.name) + "-chart.json";

		const artistBox = textboxes[1];
		if (artistBox.focus) ChartState.song.manifest.artist = String(artistBox.value);
		else artistBox.value = ChartState.song.manifest.artist;

		const charterBox = textboxes[2];
		if (charterBox.focus) ChartState.song.manifest.charter = String(charterBox.value);
		else charterBox.value = ChartState.song.manifest.charter;

		const bpmTextbox = textboxes[3];
		if (bpmTextbox.focus) ChartState.song.manifest.initial_bpm = Number(bpmTextbox.value);
		else bpmTextbox.value = ChartState.song.manifest.initial_bpm.toString();

		const stepsPerBeatBox = textboxes[4];
		if (stepsPerBeatBox.focus) ChartState.conductor.stepsPerBeat = Number(stepsPerBeatBox.value);
		else stepsPerBeatBox.value = ChartState.conductor.stepsPerBeat.toString();

		const beatsPerMeasureBox = textboxes[5];
		if (beatsPerMeasureBox.focus) ChartState.conductor.beatsPerMeasure = Number(beatsPerMeasureBox.value);
		else beatsPerMeasureBox.value = ChartState.conductor.beatsPerMeasure.toString();

		ChartState.song.manifest.initial_scrollspeed = scrollSpeedSlider.value;
	});
}

/** Opens the dialog with extra info for the chart editor */
export function openChartAboutDialog() {
	let controls = [
		"Left click - Place note",
		"Middle click - Copy note color",
		"Right click - Delete note",
		"Shift + Left click - Open event dialog",
		null,
		"1, 2, 3, 4 - Change the note color",
		"W, S - Moves up or down the camera",
		"Space - Pause/Unpause",
		"Ctrl + A - Select all notes",
		"Ctrl + C - Copy notes",
		"Ctrl + V - Paste notes",
		"Ctrl + X - Cut notes",
		"Ctrl + Z - Undo",
		"Ctrl + Y - Redo",
	];

	const dialog = GameDialog.openDialog({
		width: 400,
		height: 500,
	});

	const controlsText = dialog.add([
		text(controls.join("\n"), { size: 16, font: "lambda" }),
		pos(),
		opacity(0.5),
		anchor("botleft"),
	]);

	const aboutText = dialog.add([
		text("Amy's dance game chart editor (v1.0)", { size: 16, font: "lambda" }),
	]);
}

export function openEventDialog(event: ChartEvent, ChartState: StateChart) {
	const spacing = 50;
	const elementsLength = Object.keys(event.value).length;

	const dialog = GameDialog.openDialog({
		width: width() / 2,
		height: (spacing + 10) * elementsLength,
	});

	const initialPos = vec2(-dialog.width / 2, -dialog.height * 0.5);

	function getTypeOfValue(key: string) {
		if (typeof event.value[key] == "string") return "string";
		else if (typeof event.value[key] == "number") return "number";
		else if (typeof event.value[key] == "boolean") return "boolean";
	}

	const keysAndBoxes = {};

	Object.keys(event.value).forEach((valueKey, index) => {
		let position = vec2(initialPos.x, initialPos.y + spacing * index);

		// handle x and y
		if (Object.keys(event.value).includes("x") && Object.keys(event.value).includes("y")) {
			// if the property was already passed
			if (keysAndBoxes["y"]) {
				// reduces one
				position.y -= spacing;
			}
		}

		if (getTypeOfValue(valueKey) == "number") {
			if (valueKey == "y") {
				// get previous textbox
				const previousTextbox = keysAndBoxes["x"];
				if (!previousTextbox) throw new Error("Tried adding a Y textbox without a X textbox what a noob");
				position.x = previousTextbox.pos.x + previousTextbox.widthOfBox;
				position.y = previousTextbox.pos.y;
			}

			const textbox = dialog_addTextbox({
				title: valueKey,
				dialog,
				length: 3,
				type: "number",
				position: position,
				fallBackValue: 0,
				startingValue: event.value[valueKey],
			});

			keysAndBoxes[valueKey] = textbox;
		}
		else if (getTypeOfValue(valueKey) == "string") {
			const textbox = dialog_addTextbox({
				title: valueKey,
				dialog,
				length: 10,
				type: "string",
				position: position,
				fallBackValue: "",
				startingValue: event.value[valueKey],
			});

			keysAndBoxes[valueKey] = textbox;
		}
		else if (getTypeOfValue(valueKey) == "boolean") {
			const textbox = dialog_addCheckbox({
				title: valueKey,
				dialog,
				position: position,
				startingValue: event.value[valueKey],
			});

			keysAndBoxes[valueKey] = textbox;
		}
	});

	dialog.onUpdate(() => {
		Object.keys(keysAndBoxes).forEach((key) => {
			event.value[key] = keysAndBoxes[key].value;

			// this would be the vec2
			// event.value[key]

			// would return ["x", "y"]
			// Object.keys(event.value[key])

			// if (Object.keys(event.value[key]).includes("x") || Object.keys(event.value[key]).includes("y")) {
			// 	event.value[key].x = keysAndBoxes[key].x
			// 	event.value[key].y = keysAndBoxes[key].y
			// }
		});

		const eventThing = ChartState.song.chart.events.find((ev) => ChartState.conductor.timeToStep(ev.time) == ChartState.conductor.timeToStep(event.time));
		if (eventThing) eventThing.value = event.value;
	});

	return null;
}

export function openExitDialog() {
	const dialog = GameDialog.openDialog({
		width: 300,
		height: 200,
	});

	dialog.add([
		text("Are you sure you want to exit?\n(You will lose all unsaved progress)", { size: 30, align: "center" }),
		pos(0, -50),
		anchor("center"),
	]);

	const yesButton = dialog.add([
		text("Yes"),
		area(),
		pos(vec2(-50, 0)),
		"hover",
	]);

	const noButton = dialog.add([
		text("No"),
		area(),
		pos(vec2(50, 0)),
		"hover",
	]);

	noButton.onClick(() => {
		GameDialog.closeDialog();
	});
}
