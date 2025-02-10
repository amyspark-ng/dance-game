import { juice } from "../../core/juiceComp";
import { IScene, switchScene } from "../../core/scenes/KaplayState";
import { SongContent } from "../../data/song";
import { EditorState } from "../../play/editor/EditorState";
import { utils } from "../../utils";
import { TitleState } from "../scenes/TitleState";
import { CreditsState } from "./CreditsState";
import { OptionsState } from "./options/OptionsState";
import { SongSelectState } from "./songselect/SongSelectState";

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

export class MenuState implements IScene {
	index: number = 0;

	scene(this: MenuState): void {
		const somePurple = rgb(39, 20, 92);
		setBackground(somePurple);

		onUpdate(() => {
			if (isKeyPressed("right")) this.index = utils.scrollIndex(this.index, 1, buttonList.length);
			else if (isKeyPressed("left")) this.index = utils.scrollIndex(this.index, -1, buttonList.length);

			const hoveredButton = get("menubutton").find((button) => button.index == this.index);
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
					switchScene(SongSelectState, 0);
				};
			}
			else if (option == "credits") {
				theFunction = () => {
					switchScene(CreditsState);
				};
			}
			else if (option == "editor") {
				theFunction = () => {
					switchScene(EditorState, { song: new SongContent() });
				};
			}
			else if (option == "options") {
				theFunction = () => {
					switchScene(OptionsState);
				};
			}

			addMenuButton(option, theFunction);
		});

		const initialX = 100;

		onUpdate("menubutton", (menubutton) => {
			menubutton.pos.y = center().y;

			// so convulated!
			menubutton.pos.x = initialX + initialX + (menubutton.width * 1.1) * menubutton.index;

			if (this.index == menubutton.index) {
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
