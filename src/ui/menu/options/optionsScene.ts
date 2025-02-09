import { GameObj } from "kaplay";
import { cam } from "../../../core/camera";
import { _GameSave, GameSave } from "../../../core/save";
import { KaplayState } from "../../../core/scenes/KaplayState";
import { NoteskinContent } from "../../../data/noteskins";
import { Move } from "../../../play/objects/dancer";
import { utils } from "../../../utils";
import { StateMenu } from "../MenuScene";
import { StateSongSelect } from "../songselect/SongSelectScene";
import { addOptionsCheckbox, addOptionsNoteskinEnum, addOptionsStepper, optionsCheckboxComp, optionsStepperComp, optionsUIComp } from "./optionsUI";

export class StateOptions extends KaplayState {
	index: number = 0;

	constructor() {
		super();
	}
}

// master
// music
// sfx
// silly notes
// noteskin
// controls

KaplayState.scene("StateOptions", () => {
	const OptionsState = new StateOptions();
	setBackground(BLUE.lighten(30));

	const sillyNotesCheckbox = addOptionsCheckbox("Silly notes", "Wheter to make notes do the silly", (checked: boolean) => {
		GameSave.sillyNotes = checked;
	}, GameSave.sillyNotes);
	sillyNotesCheckbox.index = 0;

	const testCheckbox = addOptionsCheckbox("Silly notes", "Wheter to make notes do the silly", (checked: boolean) => {
		GameSave.sillyNotes = checked;
	}, GameSave.sillyNotes);
	sillyNotesCheckbox.index = 1;

	const masterVolume = addOptionsStepper("Master volume", "Changes the master volume", 10, 0, 100, (value) => {
		GameSave.volume = value / 100;
	}, Math.round(GameSave.volume * 10));
	masterVolume.index = 2;

	const musicVolume = addOptionsStepper("Music Volume", "Changes the music volume", 10, 0, 100, (value) => {
		GameSave.musicVolume = value / 100;
	}, Math.round(GameSave.musicVolume * 10));
	musicVolume.index = 3;

	const sfxVolume = addOptionsStepper("SFX Volume", "Changes the SFX volume", 10, 0, 100, (value) => {
		GameSave.soundVolume = value / 100;
	}, Math.round(GameSave.soundVolume * 10));
	sfxVolume.index = 4;

	const noteskinEnum = addOptionsNoteskinEnum(NoteskinContent.getByName(GameSave.noteskin), NoteskinContent.loaded, (name) => {
		GameSave.noteskin = name;
	});
	noteskinEnum.index = 5;

	const uiElements = get("optionsUI", { liveUpdate: true }) as GameObj<optionsUIComp | any>[];
	onUpdate("optionsUI", (element: GameObj<optionsUIComp | any>) => {
		element.focused = element.index == OptionsState.index;

		element.pos.y = 50 + (element.height * 1.25) * element.index;

		if (element.focused) {
			element.pos.x = lerp(element.pos.x, 70, 0.25);
		}
		else {
			element.pos.x = lerp(element.pos.x, 50, 0.25);
		}
	});

	onUpdate(() => {
		const element = uiElements.find((element) => element.focused);

		if (isKeyPressed("down")) {
			OptionsState.index = utils.scrollIndex(OptionsState.index, 1, uiElements.length);
		}
		else if (isKeyPressed("up")) {
			OptionsState.index = utils.scrollIndex(OptionsState.index, -1, uiElements.length);
		}
		else if (isKeyPressed("enter")) {
			if (element) {
				if (element.is("checkbox")) {
					(element as GameObj<optionsCheckboxComp>).check();
				}
			}
		}

		if (isKeyPressedRepeat("left")) {
			if (element) {
				if (element.is("stepper")) {
					(element as GameObj<optionsStepperComp>).change(-1);
				}
			}
		}
		else if (isKeyPressedRepeat("right")) {
			if (element) {
				if (element.is("stepper")) {
					(element as GameObj<optionsStepperComp>).change(1);
				}
			}
		}
	});

	onSceneLeave(() => {
		// just in case
		GameSave.save();
	});

	onKeyPress("escape", () => KaplayState.switchState(StateMenu, "options"));
});
