import { juice } from "../../core/juiceComp";
import { GameSave } from "../../core/save";
import { KaplayState } from "../../core/scenes/KaplayState";
import { paramsEditor, StateChart } from "../../play/editor/EditorState";
import { SongContent } from "../../play/song";
import { utils } from "../../utils";
import { StateTitle } from "../TitleScene";
import { StateCredits } from "./CreditsScene";
import { StateOptions } from "./options/OptionsScene";
import { StateSongSelect } from "./songselect/SongSelectScene";

const buttonList = ["songs", "options", "credits", "editor"] as const;
type buttonOption = typeof buttonList[number];

// i'd be cool if when you start hovering over it, it did a 3d spin and then a 2d waving of the rotation
// and the other ones should also do something idk one maybe make them do like a wave
const timeForMenuSpin = 0.5;

export function addMenuButton(title: buttonOption, action: () => void) {
	const icon = add([
		sprite("cdCase"),
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

	return icon;
}

export class StateMenu extends KaplayState {
	index: number = 0;
	constructor(option: typeof buttonList[number]) {
		super("menu");
		this.index = buttonList.indexOf(option) ?? 0;
	}
}

KaplayState.scene("menu", (MenuState: StateMenu) => {
	const somePurple = rgb(39, 20, 92);
	setBackground(somePurple);

	onUpdate(() => {
		if (isKeyPressed("right")) MenuState.index = utils.scrollIndex(MenuState.index, 1, 5);
		else if (isKeyPressed("left")) MenuState.index = utils.scrollIndex(MenuState.index, -1, 5);

		const hoveredButton = get("menubutton").find((button) => button.index == MenuState.index);
		if (!hoveredButton) return;

		if (isKeyPressed("enter")) {
			hoveredButton.spin();
			wait(timeForMenuSpin, () => {
				hoveredButton.action();
			});
		}
	});

	buttonList.forEach((option) => {
		let theFunction = () => {};

		if (option == "songs") {
			theFunction = () => {
				KaplayState.switchState(new StateSongSelect(0));
			};
		}
		else if (option == "credits") {
			theFunction = () => {
				KaplayState.switchState(new StateCredits());
			};
		}
		else if (option == "editor") {
			theFunction = () => {
				KaplayState.switchState(
					new StateChart({ dancer: GameSave.dancer, playbackSpeed: 1, seekTime: 0, song: new SongContent() }),
				);
			};
		}
		else if (option == "options") {
			theFunction = () => {
				KaplayState.switchState(new StateOptions());
			};
		}

		addMenuButton(option, theFunction);
	});

	const initialX = 100;

	onUpdate("menubutton", (menubutton) => {
		menubutton.pos.y = center().y;

		// so convulated!
		menubutton.pos.x = initialX + initialX + (menubutton.width * 1.1) * menubutton.index;

		if (MenuState.index == menubutton.index) {
			menubutton.opacity = 1;
		}
		else menubutton.opacity = 0.5;
	});

	onKeyPress("escape", () => {
		KaplayState.switchState(new StateTitle());
	});
});
