import { _GameSave, GameSave } from "../../../core/save";
import { KaplayState } from "../../../core/scenes/KaplayState";
import { getNoteskinSprite, NoteskinContent } from "../../../data/noteskins";
import { Move } from "../../../play/objects/dancer";
import { utils } from "../../../utils";
import { StateMenu } from "../MenuScene";
import { StateSongSelect } from "../songselect/SongSelectScene";

export class StateOptions extends KaplayState {
	noteskinIndex: number = 0;
	focusingNoteskin: boolean = true;
	controlIndex: number = 0;
	focusingControl: boolean = false;

	constructor() {
		super("options");
	}
}

KaplayState.scene("options", (OptionsState: StateOptions) => {
	setBackground(BLUE.lighten(30));

	// add([
	// 	text("OPTIONS", { size: 80 }),
	// 	anchor("center"),
	// 	pos(center().x, 70),
	// ]);

	const moves = ["left", "down", "up", "right"];
	NoteskinContent.loaded.forEach((noteskin, noteskinIndex) => {
		const noteskinData = NoteskinContent.getByName(noteskin.name);

		moves.forEach((move: Move, moveIndex) => {
			const note = add([
				sprite(noteskinData.getSprite(move)),
				pos(center()),
				anchor("center"),
				opacity(),
				area(),
				"hover",
			]);

			note.pos = note.pos.add(vec2(60 * moveIndex, noteskinIndex * 60));

			note.onUpdate(() => {
				if (GameSave.noteskin == noteskin.name) note.opacity = 1;
				else note.opacity = 0.5;
			});

			note.onClick(() => {
				GameSave.noteskin = noteskin.name;
			});
		});
	});

	Object.keys(GameSave.gameControls).forEach((key, index) => {
		const square = add([
			rect(50, 50),
			pos(80 * index, 0),
			color(BLACK),
			opacity(),
			area(),
			"key",
			"hover",
			{
				focused: false,
			},
		]);

		square.pos = vec2(30).add(80 * index, 0);

		square.onUpdate(() => {
			if (get("key").some((key) => key.focused) && !square.focused) square.opacity = 0.5;
			else if (get("key").some((key) => key.focused) && square.focused) square.opacity = 1;
			else square.opacity = 1;
		});

		square.onClick(() => {
			square.focused = true;
			const inputEV = onKeyPress((ch) => {
				GameSave.gameControls[key] = ch;
				inputEV.cancel();
				square.focused = false;
			});
		});

		square.onDraw(() => {
			drawText({
				text: GameSave.gameControls[key],
				color: WHITE,
				align: "center",
				size: square.height / 2,
			});
		});
	});

	onSceneLeave(() => {
		// just in case
		GameSave.save();
	});

	onKeyPress("escape", () => KaplayState.switchState(new StateMenu("options")));
});
