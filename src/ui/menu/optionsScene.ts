import { Key, Vec2 } from "kaplay";
import { GameSave } from "../../core/gamesave";
import { noteskins } from "../../core/loader";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { goScene } from "../../core/scenes"
import { utils } from "../../utils";
import { paramsSongSelect } from "../songselectscene"

// draws a key "sprite"
function drawKey(key: string, position: Vec2) {
	drawRect({
		width: 60,
		height: 60,
		pos: position,
		color: BLACK.lighten(40),
		anchor: "center",
	})

	if (key == "left") key = "←"
	else if (key == "down") key = "↓"
	else if (key == "up") key = "↑"
	else if (key == "right") key = "→"
	
	else key = key.toUpperCase()

	drawText({
		text: key,
		size: 30,
		anchor: "center",
		pos: position,
	})
}

class StateOptions {
	/** The current ui element in the current page */
	index: number = 0;
	
	/** The current page, will be pased to manageOptionsState */
	page: number = 0;

	/** Will be disabled when the player is inputting control keys */
	menuInputDisabled: boolean = false
}

/** Manages the UI for the options */
function manageOptionsState(page: number, OptionsState:StateOptions) {
	const tagForUI = "optionsUIEl"
	
	function clearElements() {
		get(tagForUI).forEach((obj) => {
			obj.paused = true
			tween(obj.pos.x, obj.pos.x - width(), 0.1, (p) => obj.pos.x = p).onEnd(() => {
				obj.destroy()
			})
		})
	}

	if (page == 0 || page == 1 || page == 2) {
		clearElements()
	}

	// noteskins
	if (page == 0) {
		OptionsState.index = noteskins.indexOf(GameSave.preferences.noteskin)
		if (OptionsState.index == -1) OptionsState.index = 0
		
		const noteSkinsTitle = add([
			text("NOTESKINS"),
			anchor("center"),
			pos(center().x, 100),
			tagForUI,
		])

		noteSkinsTitle.onUpdate(() => {
			if (isKeyPressed("down")) {
				OptionsState.index = utils.scrollIndex(OptionsState.index, 1, noteskins.length)
			}
			
			else if (isKeyPressed("up")) {
				OptionsState.index = utils.scrollIndex(OptionsState.index, -1, noteskins.length)
			}

			else if (isKeyPressed("enter")) {
				const currentContainer = get("noteskincontainer").filter((container) => container.index == OptionsState.index)[0]
				if (currentContainer) {
					const newNoteskin = noteskins[OptionsState.index]

					GameSave.preferences.noteskin = newNoteskin 
					
					currentContainer.bop({
						startScale: vec2(1.2),
						endScale: vec2(1)
					})
				}
			}
		})

		let movements = ["up", "down", "left", "right"]

		noteskins.forEach((noteSkinType, noteskinIndex) => {
			const noteskinContainer = add([
				opacity(1),
				scale(),
				pos(),
				juice(),
				anchor("center"),
				"noteskincontainer",
				noteSkinType,
				tagForUI,
				{
					index: noteskinIndex,
					update() {
						if (OptionsState.index == noteskinIndex) this.opacity = 1
						else this.opacity = 0.5
					}
				}
			])
			
			movements.forEach((move, movIndex) => {
				const thePos = utils.getPosInGrid(center(), noteskinIndex, movIndex, vec2(80))
	
				noteskinContainer.add([
					sprite(noteSkinType + "_" + move),
					pos(thePos.x, thePos.y),
					anchor("center"),
					opacity(),
					tagForUI,
					{
						update() {
							this.opacity = this.parent.opacity;
						}
					}
				])
			})
		})
	}
	
	// control keys
	else if (page == 1) {
		OptionsState.index = 0
		const title = add([
			text("CONTROL KEYS"),
			anchor("center"),
			pos(center().x, 100),
			tagForUI,
		])

		// according to the spritesheet
		const moves = ["left", "right", "down", "up"]

		moves.forEach((move, index) => {
			const indexToMove = moves[index]
			const key = add([
				sprite(GameSave.preferences.noteskin + "_" + move),
				pos(80 + 80 * index, center().y),
				anchor("center"),
				opacity(),
				tagForUI,
				{
					index: index,
				}
			])
			key.onUpdate(() => {
				if (OptionsState.index == index) key.opacity = 1
				else key.opacity = 0.5
			})

			key.onDraw(() => {
				drawKey(GameSave.preferences.gameControls[indexToMove].kbKey, vec2(0, 60))
			})
		})

		let charInputEv = null
		title.onUpdate(() => {
			if (isKeyPressed("down")) {
				OptionsState.index = utils.scrollIndex(OptionsState.index, 1, 4)
			}

			else if (isKeyPressed("up")) {
				OptionsState.index = utils.scrollIndex(OptionsState.index, -1, 4)
			}

			else if (isKeyPressed("enter")) {
				OptionsState.menuInputDisabled = true
				charInputEv = onCharInput((ch) => {
					if (ch == " " || ch == "+" || ch == "-") {
						shake(1)
					}

					// pressed a key that can be used
					else {
						charInputEv.cancel()
						OptionsState.menuInputDisabled = false
						
						const indexToMove = moves[OptionsState.index]
						GameSave.preferences.gameControls[indexToMove].kbKey = ch
					}
				})
			}
		})
	}

	else if (page == 2) {
		add([
			text("SOUND + ETC"),
			anchor("center"),
			pos(center().x, 100),
			"optionsUIEl"
		])
	}
}

export function OptionsScene() { scene("options", () => {
	setBackground(BLUE.lighten(30))

	const optionsState = new StateOptions()

	manageOptionsState(0, optionsState)

	const keysManager = add([
		pos(0, 0),
		anchor("left"),
		opacity(0),
		"keysManager",
	])

	// must reach 1 or -1 to get to the next page
	let progressOnPage = 0

	/** How long it'll take to reach the next page */
	const timeToChange = 0.5

	// i don't like key events
	keysManager.onUpdate(() => {
		if (isKeyDown("left")) {
			if (progressOnPage >= timeToChange) {
				progressOnPage = 0
				optionsState.page = utils.scrollIndex(optionsState.page, -1, 3)
				manageOptionsState(optionsState.page, optionsState)
			}

			else {
				progressOnPage += dt()
			}
		}

		else if (isKeyDown("right")) {
			if (progressOnPage <= -timeToChange) {
				progressOnPage = 0
				optionsState.page = utils.scrollIndex(optionsState.page, 1, 3)
				manageOptionsState(optionsState.page, optionsState)
			}

			else {
				progressOnPage -= dt()
			}
		}
	})

	add([
		text("OPTIONS", { size: 60 }),
		anchor("center"),
		pos(center().x, 50),
	])
	
	onKeyPress("escape", () => {
		goScene("songselect", { index: 0 } as paramsSongSelect)
	})
})}