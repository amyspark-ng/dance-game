import { AreaComp, GameObj } from "kaplay";
import { drag, dragger } from "../../core/plugins/features/drag";
import { goScene, transitionToScene } from "../../core/scenes";
import { fadeOut } from "../../core/transitions/fadeOutTransition";
import {
	dialog_addCheckbox,
	dialog_addSlider,
	dialog_addTextbox,
	dialog_changeCover,
	dialog_changeSong,
	textboxOpt,
} from "../../ui/dialogs/dialogFields";
import { GameDialog } from "../../ui/dialogs/gameDialog";
import { utils } from "../../utils";
import { ChartEvent, SongContent } from "../song";
import { StateChart } from "./EditorState";

class MenuBarButton {
	text: string;
	commands: { [key: string]: string; };
	constructor(text: string, commands: { [key: string]: string; }) {
		this.text = text;
		this.commands = commands;
	}
	static getShortcut(text: string) {
		return "(" + text.split("(")[1].split(")")[0] + ")";
	}
}

const MenuBarButtons = [
	new MenuBarButton("File", {
		// "test": "tetero teta palabra bien largota",
		"newchart": "New chart (Ctrl + N)",
		"openchart": "Open chart (Ctrl + O)",
		"savechartas": "Download chart (Ctrl + Shift + S)",
		"exit": "Exit (Ctrl + Q)",
	}),
	new MenuBarButton("Edit", {
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
	new MenuBarButton("Help", {
		"about": "About (F1)",
		"settings": "Settings (F2)",
	}),
];

export class EditorDialogs {
	static settings(ChartState: StateChart) {
		const dialog = GameDialog.openDialog({ width: 600, height: 400 });
		const suSlider = dialog_addSlider({
			dialog,
			title: "Background color",
			position: vec2(-dialog.width, 0),
			initialValue: 10,
			range: [0, 300],
		});
	}
}

export function addEditorUI(ChartState: StateChart) {
	const topbar = onDraw(() => {
		drawRect({
			width: width(),
			height: 30,
			color: GameDialog.HEADER_COLOR,
			pos: vec2(0, 0),
			opacity: 1,
		});
	});

	const WIDTH_OF_CHARACTER = formatText({ text: "A", size: 20 }).width;

	const contextMenu = add([
		rect(0, 0),
		color(GameDialog.HEADER_COLOR),
		pos(),
		{
			currentButton: null as MenuBarButton,
		},
	]);

	let heightOfMenu = 0;
	contextMenu.onUpdate(() => {
		if (contextMenu.currentButton != null && contextMenu.children.length == 0) {
			const longestCommand = Object.values(contextMenu.currentButton.commands).reduce((a, b) => {
				return a.length > b.length ? a : b;
			});

			const commandsLength = Object.keys(contextMenu.currentButton.commands).length;

			heightOfMenu = commandsLength * 20 + 10;
			contextMenu.width = longestCommand.length * WIDTH_OF_CHARACTER + 10;

			Object.keys(contextMenu.currentButton.commands).forEach((commandKey, index) => {
				const action = contextMenu.currentButton.commands[commandKey];
				const actionWithoutShortcut = action.replace(MenuBarButton.getShortcut(action), "").trim();
				const contextButton = contextMenu.add([
					text(actionWithoutShortcut, { size: 20 }),
					pos(0, index * 20),
					area(),
					opacity(),
					"hover",
				]);

				contextButton.pos = contextButton.pos.add(5);

				contextButton.area.shape = new Rect(vec2(-5, 0), contextMenu.width, 20);

				contextButton.onUpdate(() => {
					contextButton.opacity = lerp(contextButton.opacity, contextButton.isHovering() ? 1 : 0.5, 0.5);
				});

				contextButton.onDraw(() => {
					drawText({
						text: MenuBarButton.getShortcut(contextMenu.currentButton.commands[commandKey]),
						pos: vec2(contextMenu.width - 5, 0),
						color: WHITE,
						size: 20,
						anchor: "topright",
						align: "right",
						opacity: contextButton.opacity,
					});
				});

				contextButton.onClick(() => {
					if (ChartState.actions[commandKey]) ChartState.actions[commandKey]();
					else debug.log("no button for that");
					contextMenu.currentButton = null;
				});
			});
		}
		else if (contextMenu.currentButton == null && contextMenu.children) {
			heightOfMenu = 0;
			contextMenu.removeAll();
		}

		contextMenu.height = lerp(contextMenu.height, heightOfMenu, 0.8);
	});

	contextMenu.onDraw(() => {
		if (contextMenu.currentButton == null) return;
		Object.keys(contextMenu.currentButton.commands).forEach((commandKey, index) => {
			// drawRect({
			// 	pos: vec2(0, index * 25),
			// 	width: contextMenu.width,
			// 	height: 25,
			// 	fill: false,
			// 	outline: {
			// 		width: 1,
			// 		color: GameDialog.HEADER_COLOR.lighten(50),
			// 	},
			// });
		});
	});

	function addMenuBarButton(button: MenuBarButton) {
		const buttonObj = add([
			text(button.text, { size: 20 }),
			pos(10, 5),
			area(),
			anchor("topleft"),
			opacity(),
			"menubutton",
			"hover",
			{
				menuButton: button,
			},
		]);

		return buttonObj;
	}

	let menubuttons: ReturnType<typeof addMenuBarButton>[] = [];

	MenuBarButtons.forEach((button, index) => {
		const buttonObj = addMenuBarButton(button);
		menubuttons[index] = buttonObj;
	});

	menubuttons.forEach((button, index) => {
		let previousButton = menubuttons[index - 1];
		if (previousButton == undefined) previousButton = { pos: vec2(0, 0), width: 0 } as any;
		button.pos.x = 10 + previousButton.pos.x + previousButton.width;

		button.area.shape = new Rect(vec2(0, -5), button.width, 30);

		button.onClick(() => {
			contextMenu.pos.x = button.pos.x;
			contextMenu.pos.y = button.pos.y + button.height + 5;
			contextMenu.removeAll();
			contextMenu.currentButton = button.menuButton;
		});

		button.onUpdate(() => {
			if (button.isHovering() || contextMenu.currentButton == button.menuButton) {
				button.opacity = lerp(button.opacity, 1, 0.5);
			}
			else {
				button.opacity = lerp(button.opacity, 0.5, 0.5);
			}
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

		const eventThing = ChartState.song.chart.events.find((ev) =>
			ChartState.conductor.timeToStep(ev.time) == ChartState.conductor.timeToStep(event.time)
		);
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
		// "hover",
	]);

	const noButton = dialog.add([
		text("No"),
		area(),
		pos(vec2(50, 0)),
		// "hover",
	]);

	noButton.onClick(() => {
		GameDialog.closeDialog();
	});
}
