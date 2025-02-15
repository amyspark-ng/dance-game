import { juice } from "../../core/juiceComp";
import { GameSave } from "../../core/save";
import { IScene, switchScene } from "../../core/scenes/KaplayState";
import { Song } from "../../data/song";
import { EditorState } from "../../play/editor/EditorState";
import { utils } from "../../utils";
import { TitleState } from "../scenes/TitleState";
import { CreditsState } from "./CreditsState";
import { ModsState } from "./mods/ModState";
import { OptionsState } from "./options/OptionsState";
import { ScoresState } from "./ScoresState";
import { SongSelectState } from "./songselect/SongSelectState";

const buttonList = ["songs", "options", "editor", "scores", "credits", "mods"] as const;
type buttonOption = typeof buttonList[number];

// i'd be cool if when you start hovering over it, it did a 3d spin and then a 2d waving of the rotation
// and the other ones should also do something idk one maybe make them do like a wave
const timeForMenuSpin = 0.5;

export class MenuState implements IScene {
	index: number = 0;
	items: ReturnType<typeof this.addItem>[] = [];
	columns: number = 3;
	rows: number = 2;

	addItem(title: buttonOption, action: () => void) {
		const icon = add([
			sprite("menu" + title),
			pos(),
			opacity(),
			scale(),
			juice(),
			timer(),
			anchor("center"),
			"menubutton",
			{
				index: 0,
				action: action,
				spin() {
					this.tween(1, -1, timeForMenuSpin / 2, (p) => this.scale.x = p).onEnd(() => {
						this.tween(-1, 1, timeForMenuSpin / 2, (p) => this.scale.x = p);
					});
				},
			},
		]);

		icon.width = 200;
		icon.height = 200;

		const texty = add([
			text(title, { width: icon.width * 1.4, align: "center" }),
			pos(),
			opacity(),
			scale(),
			anchor("center"),
			juice(),
			timer(),
		]);

		texty.onUpdate(() => {
			texty.opacity = icon.opacity;
			texty.pos.x = icon.pos.x;
			texty.pos.y = icon.pos.y + (icon.height * 1.1) / 2;
		});

		icon.index = get("menubutton").indexOf(icon);
		this.items[icon.index] = icon;

		return icon;
	}

	scene(state: MenuState): void {
		const somePurple = rgb(39, 20, 92);
		setBackground(somePurple);

		onUpdate(() => {
			if (isKeyPressed("right")) state.index = utils.scrollIndex(state.index, 1, state.items.length);
			else if (isKeyPressed("left")) state.index = utils.scrollIndex(state.index, -1, state.items.length);
			else if (isKeyPressed("down")) {
				const previous = state.index;
				// i increase what's left to reach next row and add the previous vale
				const newIndex = state.index + Math.abs(state.index - this.columns) + previous;
				if (newIndex < this.items.length) state.index = newIndex;
			}
			else if (isKeyPressed("up")) {
				const newIndex = state.index - this.columns;
				if (newIndex >= 0) state.index = newIndex;
			}

			const hoveredButton = state.items.find((button) => button.index == state.index);
			if (!hoveredButton) return;

			if (isKeyPressed("enter")) {
				hoveredButton.spin();
				wait(timeForMenuSpin, () => {
					hoveredButton.action();
				});
			}
		});

		const songsButton = state.addItem("songs", () => switchScene(SongSelectState, 0));
		const optionsButton = state.addItem("options", () => switchScene(OptionsState));
		const editorButton = state.addItem("editor", () => switchScene(EditorState, { song: new Song() }));
		const scoresButton = state.addItem("scores", () => {
			if (GameSave.scores.length > 0) switchScene(ScoresState, 0);
		});
		const modsButton = state.addItem("mods", () => switchScene(ModsState));
		const creditsButton = state.addItem("credits", () => switchScene(CreditsState));

		const initialPos = vec2(250, 150);
		onUpdate("menubutton", (menubutton: ReturnType<typeof this.addItem>) => {
			const pos = utils.getPosInGrid(
				initialPos,
				Math.floor(menubutton.index / (this.rows + 1)),
				menubutton.index % this.columns,
				vec2(menubutton.width, menubutton.height).scale(1.25),
			);
			menubutton.pos = pos;

			if (state.index == menubutton.index) {
				menubutton.opacity = 1;
			}
			else menubutton.opacity = 0.5;
		});

		onKeyPress("escape", () => {
			switchScene(TitleState);
		});
	}

	constructor(option: typeof buttonList[number]) {
		this.index = buttonList.indexOf(option) ?? 0;
	}
}
