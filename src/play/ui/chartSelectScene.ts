import { GameSave } from "../../core/gamesave"
import { dancers } from "../../core/loader"
import { goScene, transitionToScene } from "../../core/scenes"
import { fadeOut } from "../../core/transitions/fadeOutTransition"
import { paramsSongSelect } from "../../ui/songselectscene"
import { utils } from "../../utils"

function addDancerChar(dancerName: string) {
	const curDancer = add([
		sprite("dancer_" + dancerName, { anim: "idle" }),
		pos(center().x, center().y),
		anchor("center"),
		scale(),
		"dancerChar",
		dancerName,
	])

	return curDancer;
}

export function CharSelectScene() { scene("charselect", (params: paramsSongSelect) => {
	/** The index of the currently selected dancer */
	console.log("CURRENT DANCER ACCORDING TO SAVE: " + GameSave.preferences.dancer)

	let curIndex = dancers.map(dancer => dancer.dancerName).indexOf(GameSave.preferences.dancer)
	const dancerNames = dancers.map(dancer => dancer.dancerName)

	dancers.forEach((dancer, index) => {
		let intendedYPos = center().y
		let intendedXScale = 1

		const dancerChar = addDancerChar(dancer.dancerName)

		dancerChar.onUpdate(() => {
			if (dancers[curIndex].dancerName == dancer.dancerName) {
				intendedYPos = center().y
				intendedXScale = 1
			}
			
			else {
				intendedYPos = center().y + dancerChar.height * 1.5 * (index - curIndex)
				intendedXScale = 0
			}
			
			dancerChar.pos.y = lerp(dancerChar.pos.x, intendedYPos - height() / 2, 0.5)
			dancerChar.scale.x = lerp(dancerChar.scale.x, intendedXScale, 0.5)
		})
	})

	onKeyPress("up", () => {
		curIndex = utils.scrollIndex(curIndex, -1, dancers.length)
		GameSave.preferences.dancer = dancerNames[curIndex]
	})
	
	onKeyPress("down", () => {
		curIndex = utils.scrollIndex(curIndex, 1, dancers.length)
		GameSave.preferences.dancer = dancerNames[curIndex]
	})

	onKeyPress("enter", () => {
		get(GameSave.preferences.dancer)[0].play("victory")
		transitionToScene(fadeOut, "songselect", { index: params.index } as paramsSongSelect)
		GameSave.save()
	})

	setBackground(BLUE.lighten(60))
})}