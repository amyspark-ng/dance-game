import { GameSave } from "../../core/gamesave";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { goScene } from "../../core/scenes"
import { paramsChartEditor } from "../../play/chartEditor/chartEditorBackend";
import { Move } from "../../play/objects/dancer";
import { moveToColor } from "../../play/objects/note";
import { SongContent } from "../../play/song";
import { utils } from "../../utils";
import { paramsSongSelect } from "../songselectscene"

// i'd be cool if when you start hovering over it, it did a 3d spin and then a 2d waving of the rotation
// and the other ones should also do something idk one maybe make them do like a wave
const timeForMenuSpin = 0.5

export function addMenuButton(title: string, action: () => void) {
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
					this.tween(-1, 1, timeForMenuSpin / 2, (p) => this.scale.x = p)
				})
			}
		}
	])

	icon.width = 200
	icon.height = 200
	
	const texty = add([
		text(title, { width: icon.width * 1.4, align: "center", }),
		pos(),
		opacity(),
		scale(),
		anchor("center"),
		juice(),
		timer(),
	])

	texty.onUpdate(() => {
		texty.opacity = icon.opacity
		texty.pos.x = icon.pos.x
		texty.pos.y = icon.pos.y + (icon.height * 1.1) / 2
	})

	return icon;
}

class StateMenu {
	index: number = 0;
}

type paramsMenuScene = {
	index: number
}

export function MenuScene() { scene("menu", (params: paramsMenuScene) => {
	const somePurple = rgb(39, 20, 92)
	setBackground(somePurple)

	params.index = params.index ?? 0
	const MenuState = new StateMenu()
	MenuState.index = params.index

	onUpdate(() => {
		if (isKeyPressed("right")) MenuState.index = utils.scrollIndex(MenuState.index, 1, 5)
		else if (isKeyPressed("left")) MenuState.index = utils.scrollIndex(MenuState.index, -1, 5)
	
		const hoveredButton = get("menubutton").find((button) => button.index == MenuState.index)
		if (!hoveredButton) return;
		
		if (isKeyPressed("enter")) {
			hoveredButton.spin()
			wait(timeForMenuSpin, () => {
				hoveredButton.action()
			})
		}
	})

	const songsButton = addMenuButton("Songs", () => {
		goScene("songselect", { index: 0 } as paramsSongSelect )
	})
	songsButton.index = 0

	const optionsButton = addMenuButton("Options", () => {
		goScene("options")
	})
	optionsButton.index = 1

	const achievementsButton = addMenuButton("Achievements", () => {

	})
	achievementsButton.index = 2

	const creditsButton = addMenuButton("Credits", () => {

	})
	creditsButton.index = 3

	const chartButton = addMenuButton("Chart Editor", () => {
		goScene("charteditor", { dancer: GameSave.dancer, song: null } as paramsChartEditor)
	})
	chartButton.index = 4

	const initialX = 100

	onUpdate("menubutton", (menubutton) => {
		menubutton.pos.y = center().y
		
		// so convulated!
		menubutton.pos.x = initialX + initialX + (menubutton.width * 1.1) * menubutton.index

		if (MenuState.index == menubutton.index) {
			menubutton.opacity = 1
		}

		else menubutton.opacity = 0.5
	})

	onKeyPress("escape", () => {
		goScene("title")
	})
})}