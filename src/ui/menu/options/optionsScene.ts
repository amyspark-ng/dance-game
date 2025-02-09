import { GameObj } from "kaplay";
import { cam } from "../../../core/camera";
import { _GameSave, GameSave } from "../../../core/save";
import { KaplayState } from "../../../core/scenes/KaplayState";
import { SoundTray } from "../../../core/soundtray";
import { NoteskinContent } from "../../../data/noteskins";
import { utils } from "../../../utils";
import { StateMenu } from "../MenuScene";
import { addOptionsButton, addOptionsCheckbox, addOptionsKeyInput, addOptionsMoveInput, addOptionsNoteskinEnum, addOptionsStepper } from "./optionsUI";

function makeLabel(string: string) {
	const labelObj = make([
		text(string, { align: "center", size: 60 }),
		anchor("left"),
		pos(0, 0),
	]);

	return labelObj;
}

function addDescriptionObj(string: string) {
	const description = add([
		rect(100, 100),
		pos(),
		color(BLACK),
		opacity(0.75),
		anchor("center"),
		fixed(),
		z(100),
		"description",
	]);

	description.pos.x = center().x;

	description.onUpdate(() => {
		description.pos.y = height() - description.height;
	});

	const textobj = description.add([
		text(string, { align: "center" }),
		anchor("center"),
		pos(),
	]);

	description.height = textobj.height * 1.5;
	description.width = textobj.width * 1.5;
}

export class StateOptions extends KaplayState {
	index: number = 0;
	inputEnabled: boolean = true;

	descriptions: string[] = [];
	items: GameObj<any>[] = [];

	get focused() {
		return this.items.find((item) => this.items.indexOf(item) == this.index);
	}

	/** Add an item
	 * @param label The label to use
	 * @param description The description of the thing
	 * @param item The function that returns the item
	 * @param args The arguments to pass to the item function
	 */
	addItem<T extends (...args: any[]) => GameObj<any>>(label: string, description: string, item: T, ...args: Parameters<T>) {
		const obj = item(...args);
		obj.use("optionsUI");

		if (label != null) {
			const labelObj = obj.add(makeLabel(label));
			labelObj.onUpdate(() => {
				labelObj.pos.x = lerp(labelObj.pos.x, obj.width + 25, 0.25);
			});
		}

		this.descriptions.push(description);
		this.items.push(obj);

		return obj;
	}

	/** The thing to run when pressing escape */
	escapeAction: () => void;

	updateDescription() {
		get("description")[0]?.destroy();
		addDescriptionObj(this.descriptions[this.index]);
	}

	switchPage(action: () => void) {
		this.index = 0;
		get("optionsUI").forEach((obj) => obj.destroy());
		this.items = [];
		this.descriptions = [];
		action();
		this.updateDescription();
	}

	constructor() {
		super();
	}
}

KaplayState.scene("StateOptions", () => {
	setBackground(BLUE.lighten(30));
	const OptionsState = new StateOptions();
	function preferencesPage() {
		OptionsState.addItem("Silly notes", "Wheter to make notes do the silly", addOptionsCheckbox, (checked: boolean) => {
			GameSave.sillyNotes = checked;
		}, GameSave.sillyNotes);

		OptionsState.addItem("Other checkbox", "Test checkbox", addOptionsCheckbox, (checked: boolean) => {
			GameSave.sillyNotes = checked;
		}, GameSave.sillyNotes);

		OptionsState.addItem("Master volume", "Changes the master volume", addOptionsStepper, 10, 0, 100, (value) => {
			GameSave.volume = value / 100;
		}, Math.round(GameSave.volume * 100));

		OptionsState.addItem("Music volume", "Changes the music volume", addOptionsStepper, 10, 0, 100, (value) => {
			GameSave.musicVolume = value / 100;
		}, Math.round(GameSave.musicVolume * 100));

		OptionsState.addItem("SFX volume", "Changes the sfx volume", addOptionsStepper, 10, 0, 100, (value) => {
			GameSave.soundVolume = value / 100;
		}, Math.round(GameSave.soundVolume * 100));

		OptionsState.addItem("Scroll speed", "Changes how fast notes will scroll", addOptionsStepper, 0.1, 1, 10, (value) => {
			GameSave.scrollSpeed = value;
		}, GameSave.scrollSpeed);

		OptionsState.addItem("Noteskin", "Changes the noteskin", addOptionsNoteskinEnum, NoteskinContent.getByName(GameSave.noteskin), NoteskinContent.loaded, (name) => {
			GameSave.noteskin = name;
		});

		OptionsState.addItem(null, "Change the keys to the game", addOptionsButton, "Controls", () => {
			OptionsState.switchPage(controlsPage);
		});

		OptionsState.escapeAction = () => {
			KaplayState.switchState(StateMenu, "options");
			OptionsState.updateDescription();
		};
	}

	function controlsPage() {
		OptionsState.addItem("Left", "Left note", addOptionsMoveInput, "left", (key) => {
			GameSave.gameControls.left = key;
		}, (focused) => {
			OptionsState.inputEnabled = !focused;
		}, GameSave.gameControls.left);

		OptionsState.addItem("Down", "Down note", addOptionsMoveInput, "down", (key) => {
			GameSave.gameControls.down = key;
		}, (focused) => {
			OptionsState.inputEnabled = !focused;
		}, GameSave.gameControls.down);

		OptionsState.addItem("Up", "Up note", addOptionsMoveInput, "up", (key) => {
			GameSave.gameControls.up = key;
		}, (focused) => {
			OptionsState.inputEnabled = !focused;
		}, GameSave.gameControls.up);

		OptionsState.addItem("Right", "Right note", addOptionsMoveInput, "right", (key) => {
			GameSave.gameControls.right = key;
		}, (focused) => {
			OptionsState.inputEnabled = !focused;
		}, GameSave.gameControls.right);

		OptionsState.addItem("Lower volume", "The key that lowers the volume", addOptionsKeyInput, (key) => {
			SoundTray.downKeys = [key];
		}, (focused) => {
			OptionsState.inputEnabled = !focused;
		}, GameSave.soundDownKey);

		OptionsState.addItem("Increase volume", "The key that increases the volume", addOptionsKeyInput, (key) => {
			SoundTray.upKeys = [key];
		}, (focused) => {
			OptionsState.inputEnabled = !focused;
		}, GameSave.soundUpKey);

		OptionsState.updateDescription();
		OptionsState.escapeAction = () => {
			OptionsState.switchPage(preferencesPage);
		};
	}

	OptionsState.switchPage(preferencesPage);
	OptionsState.updateDescription();

	onUpdate(() => {
		let previousSelection = OptionsState.focused;
		if (isKeyPressed("down")) OptionsState.index = utils.scrollIndex(OptionsState.index, 1, OptionsState.items.length);
		else if (isKeyPressed("up")) OptionsState.index = utils.scrollIndex(OptionsState.index, -1, OptionsState.items.length);
		if (previousSelection != OptionsState.focused) {
			// onChange
			OptionsState.updateDescription();
		}

		if (!OptionsState.focused) return;
		if (OptionsState.focused.handleInput) OptionsState.focused.handleInput();
		if (OptionsState.focused != undefined) cam.pos.y = lerp(cam.pos.y, (OptionsState.focused.pos.y + height() / 2) - OptionsState.focused.height, 0.25);
	});

	onUpdate("optionsUI", (element: GameObj<any>) => {
		const elIndex = OptionsState.items.indexOf(element);
		const isFocused = element == OptionsState.focused;

		element.pos.y = 50 + 80 * elIndex;

		if (isFocused) {
			element.pos.x = lerp(element.pos.x, 70, 0.25);
		}
		else {
			element.pos.x = lerp(element.pos.x, 50, 0.25);
		}
	});

	onKeyPress("escape", () => {
		GameSave.save(); // just in case
		cam.reset();
		OptionsState.escapeAction();
	});
});
