import { GameObj } from "kaplay";
import { cam } from "../../../core/camera";
import { _GameSave, GameSave } from "../../../core/save";
import { IScene, switchScene } from "../../../core/scenes/KaplayState";
import { SoundTray } from "../../../core/soundtray";
import { getCurNoteskin, Noteskin } from "../../../data/noteskins";
import { utils } from "../../../utils";
import { MenuState } from "../MenuState";
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
		rect(100, 100, { radius: 5 }),
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

export class OptionsState implements IScene {
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
	escapeAction: () => void = () => {};

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

	scene(state: OptionsState): void {
		setBackground(BLUE.lighten(30));

		function controlsPage() {
			state.addItem("Left", "Left note", addOptionsMoveInput, "left", (key) => {
				GameSave.gameControls.left = key;
			}, (focused) => {
				state.inputEnabled = !focused;
			}, GameSave.gameControls.left);

			state.addItem("Down", "Down note", addOptionsMoveInput, "down", (key) => {
				GameSave.gameControls.down = key;
			}, (focused) => {
				state.inputEnabled = !focused;
			}, GameSave.gameControls.down);

			state.addItem("Up", "Up note", addOptionsMoveInput, "up", (key) => {
				GameSave.gameControls.up = key;
			}, (focused) => {
				state.inputEnabled = !focused;
			}, GameSave.gameControls.up);

			state.addItem("Right", "Right note", addOptionsMoveInput, "right", (key) => {
				GameSave.gameControls.right = key;
			}, (focused) => {
				state.inputEnabled = !focused;
			}, GameSave.gameControls.right);

			state.addItem("Lower volume", "The key that lowers the volume", addOptionsKeyInput, (key) => {
				SoundTray.downKeys = [key];
			}, (focused) => {
				state.inputEnabled = !focused;
			}, GameSave.soundDownKey);

			state.addItem("Increase volume", "The key that increases the volume", addOptionsKeyInput, (key) => {
				SoundTray.upKeys = [key];
			}, (focused) => {
				state.inputEnabled = !focused;
			}, GameSave.soundUpKey);

			state.updateDescription();
			state.escapeAction = () => {
				state.switchPage(preferencesPage);
			};
		}

		function preferencesPage() {
			state.addItem("Silly notes", "Wheter to make notes do the silly", addOptionsCheckbox, (checked: boolean) => {
				GameSave.sillyNotes = checked;
			}, GameSave.sillyNotes);

			state.addItem("Other checkbox", "Test checkbox", addOptionsCheckbox, (checked: boolean) => {
				GameSave.sillyNotes = checked;
			}, GameSave.sillyNotes);

			state.addItem("Master volume", "Changes the master volume", addOptionsStepper, 10, 0, 100, (value) => {
				GameSave.volume = value / 100;
			}, Math.round(GameSave.volume * 100));

			state.addItem("Music volume", "Changes the music volume", addOptionsStepper, 10, 0, 100, (value) => {
				GameSave.musicVolume = value / 100;
			}, Math.round(GameSave.musicVolume * 100));

			state.addItem("SFX volume", "Changes the sfx volume", addOptionsStepper, 10, 0, 100, (value) => {
				GameSave.soundVolume = value / 100;
			}, Math.round(GameSave.soundVolume * 100));

			state.addItem("Scroll speed", "Changes how fast notes will scroll", addOptionsStepper, 0.1, 1, 10, (value) => {
				GameSave.scrollSpeed = value;
			}, GameSave.scrollSpeed);

			state.addItem("Noteskin", "Changes the noteskin", addOptionsNoteskinEnum, getCurNoteskin(), Noteskin.loaded, (name) => {
				GameSave.noteskin = name;
			});

			state.addItem(null, "Change the keys to the game", addOptionsButton, "Controls", () => {
				state.switchPage(controlsPage);
			});

			state.escapeAction = () => {
				switchScene(MenuState, "options");
				state.updateDescription();
			};
		}

		state.switchPage(preferencesPage);

		state.updateDescription();

		onUpdate(() => {
			let previousSelection = state.focused;
			if (isKeyPressed("down")) state.index = utils.scrollIndex(state.index, 1, state.items.length);
			else if (isKeyPressed("up")) state.index = utils.scrollIndex(state.index, -1, state.items.length);
			if (previousSelection != state.focused) {
				// onChange
				state.updateDescription();
			}

			if (!state.focused) return;
			if (state.focused.handleInput) state.focused.handleInput();
			if (state.focused != undefined) cam.pos.y = lerp(cam.pos.y, (state.focused.pos.y + height() / 2) - state.focused.height, 0.25);
		});

		onUpdate("optionsUI", (element: GameObj<any>) => {
			const elIndex = state.items.indexOf(element);
			const isFocused = element == state.focused;

			element.pos.y = 50 + 80 * elIndex;

			if (isFocused) {
				element.pos.x = lerp(element.pos.x, 70, 0.25);
			}
			else {
				element.pos.x = lerp(element.pos.x, 50, 0.25);
			}
		});

		onSceneLeave(() => {
			cam.reset();
		});

		onKeyPress("escape", () => {
			GameSave.save(); // just in case
			state.escapeAction();
		});
	}
}
