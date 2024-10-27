import { KEventController, Key, Vec2 } from "kaplay";
import { GameSave, GameSaveClass } from "../../core/gamesave";
import { goScene } from "../../core/scenes"
import { utils } from "../../utils";
import { paramsSongSelect } from "../songselectscene"

// draws a key "sprite"
function drawKey(opts: { key: string, position: Vec2, opacity: number }) {
	drawRect({
		width: 60,
		height: 60,
		pos: opts.position,
		color: BLACK.lighten(40),
		anchor: "center",
		opacity: opts.opacity,
	})

	if (opts.key == "left") opts.key = "←"
	else if (opts.key == "down") opts.key = "↓"
	else if (opts.key == "up") opts.key = "↑"
	else if (opts.key == "right") opts.key = "→"
	
	else opts.key = opts.key.toUpperCase()

	drawText({
		text: opts.key,
		size: 30,
		anchor: "center",
		pos: opts.position,
		opacity: opts.opacity
	})
}

type cursorProps = {
	pos: Vec2,
	angle: number,
	opacity: number,
	scale: Vec2,
	lerpValue: number,
}

class StateOptions {
	/** The current ui element in the current page */
	optionIndex: number = 0;
	
	/** The current "page" will either be 0, 1 or 2 referring to controls, noteskins and etc */
	pageIndex: number = 0;

	/** Will be false when the player is choosing their new keys to play */
	inputEnabled: boolean = true;

	/** Wheter the player is on the left side, like changing the page of the options */
	inPage: boolean = true;

	/** The position the cursor should have */
	cursorProps: cursorProps = { angle: 0, opacity: 1, pos: vec2(0), scale: vec2(1), lerpValue: 0.5 }
}

/**
 * Manages the UI for the pages
 * @param page What page 
 * @param OptionsState The current state of the scene
 * @param workThem If work them is true then they should start working and not only be shown
 */
function manageOptionsState(page: number, OptionsState:StateOptions, workThem:boolean = false) {
	
	// KEY EVENTS NEEDED FOR SPECIFIC OPTIONS SHOULD BE ATTACHED TO AN OBJECT IN THAT PAGE
	const tagForUI = "optionsUIEl"
	const tagForControls = "optionsUIEl_Controls"
	const tagForNoteskins = "optionsUIEl_Noteskins"
	const tagForEtc = "optionsUIEl_Etc"

	function clearElements() {
		get(tagForUI).forEach((obj) => {
			obj.paused = true
			// tween(obj.pos.x, obj.pos.x - width(), 0.1, (p) => obj.pos.x = p).onEnd(() => {
				obj.destroy()
			// })
		})
	}

	clearElements()

	// game keys
	if (page == 0) {
		OptionsState.inputEnabled = true
		let moves = Object.keys(GameSave.preferences.gameControls)

		// this is done so the isKeyPressed("enter") doesn't run the second this is triggered
		let canChangeKeys = false
		wait(0.1, () => canChangeKeys = true)

		const inputManager = add([tagForUI, tagForControls])
		inputManager.onUpdate(() => {
			if (!workThem) return;
			
			const hoveredKey = get("noteForKey").find(obj => obj.index == OptionsState.optionIndex)
			
			if (OptionsState.inputEnabled) {
				if (isKeyPressed("right")) OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, 1, moves.length)
				else if (isKeyPressed("left")) OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, -1, moves.length)
				
				else if (isKeyPressed("enter") && canChangeKeys) {
					OptionsState.inputEnabled = false
					let newKey = ""

					let arrowKeyPressEvents:KEventController[] = []
					let charInputEv:KEventController = null
					let escapeEvent:KEventController = null

					function doneIt() {
						charInputEv.cancel()
						escapeEvent.cancel()
						arrowKeyPressEvents.forEach((ev) => ev.cancel())
					
						const defaultKeys = Object.keys(new GameSaveClass().preferences.gameControls)

						// checks if any key is the same as the new key
						if (Object.values(GameSave.preferences.gameControls).some((key) => key.kbKey == newKey)) {
							// if that key is in another gameControl then set that game control to the default else don't do anything

							// runs  through each gameControl
							for (const key in GameSave.preferences.gameControls) {
								if (newKey == key) continue

								// set to default if the key is repeated
								if (GameSave.preferences.gameControls[key].kbKey == newKey) {
									GameSave.preferences.gameControls[key].kbKey = defaultKeys[Object.values(GameSave.preferences.gameControls).indexOf(GameSave.preferences.gameControls[key])]
								}
							}
						}

						GameSave.preferences.gameControls[hoveredKey.curMove].kbKey = newKey
						// so iskeypressed left and right can't run inmediately after choosing an arrow key
						wait(0.05, () => {
							OptionsState.inputEnabled = true
						})
					}

					const arrowKeys = ["left", "down", "up", "right"]
					arrowKeys.forEach((dumbKey) => {
						let keyPressEvent = onKeyPress(dumbKey, () => {
							newKey = dumbKey
							// doneIt() takes care of cancelling them
							doneIt()
						})
						arrowKeyPressEvents.push(keyPressEvent)
					})

					charInputEv = onCharInput((ch) => {
						if (ch == " " || ch == "+" || ch == "-") shake(1)
						else {
							newKey = ch
						}
						
						doneIt()
					})

					escapeEvent = onKeyPress("escape", () => {
						doneIt()
					})
				}

				OptionsState.cursorProps.opacity = 1
			}
			
			// input is disabled, thus, is changing a key
			else {
				OptionsState.cursorProps.opacity = wave(0.25, 0.5, time() * 10)
			}
			
			if (hoveredKey != undefined) {
				OptionsState.cursorProps.pos.x = hoveredKey.pos.x
				OptionsState.cursorProps.pos.y = hoveredKey.pos.y - hoveredKey.height * 0.75 
				OptionsState.cursorProps.angle = 90
			}
		})

		inputManager.onDraw(() => {
			if (!OptionsState.inputEnabled) {
				drawText({
					text: "Choosing a key",
					size: 30,
					pos: vec2(width() / 2 + 90, height() / 2 + 180),
					opacity: wave(0.5, 5, time() / 5),
				})
			}
		})

		moves.forEach((curMove, index) => {
			const initialX = (width() / 2) + 50
			const initialY = height() / 2
			const spacing = 90

			const noteForKey = add([
				sprite(GameSave.preferences.noteskin + "_" + curMove),
				pos(initialX + spacing * index, initialY),
				anchor("center"),
				opacity(1),
				"noteForKey",
				tagForUI,
				tagForControls,
				{
					index: index,
					curMove: curMove
				}
			])

			noteForKey.onDraw(() => {
				drawKey({
					key: GameSave.preferences.gameControls[curMove].kbKey,
					position: vec2(0, noteForKey.height),
					opacity: noteForKey.opacity
				})
			})
		})
	}

	if (!workThem) {
		get(tagForUI).forEach((obj) => {
			obj.opacity = 0.5
		})
	}
	
	else {
		get(tagForUI).forEach((obj) => {
			obj.opacity = 1
		})
	}
}

export function OptionsScene() { scene("options", () => {
	setBackground(BLUE.lighten(30))

	const optionsState = new StateOptions()

	add([
		text("OPTIONS", { size: 80 }),
		anchor("center"),
		pos(center().x, 70),
	])

	const optionsCursor = add([
		sprite("optionsCursor"),
		pos(),
		anchor("center"),
		opacity(),
		scale(),
		rotate(0),
	])

	optionsCursor.onUpdate(() => {
		if (optionsState.inPage) {
			const hoveredPage = get("pageText").find(page => page.index == optionsState.pageIndex)
	
			if (hoveredPage != undefined) {
				optionsState.cursorProps.pos.x = hoveredPage.pos.x - 25
				optionsState.cursorProps.pos.y = hoveredPage.pos.y
			}
		
			optionsState.cursorProps.angle = 0
		}

		// lerp stuff
		optionsCursor.pos = lerp(optionsCursor.pos, optionsState.cursorProps.pos, optionsState.cursorProps.lerpValue)
		optionsCursor.angle = lerp(optionsCursor.angle, optionsState.cursorProps.angle, optionsState.cursorProps.lerpValue)
		optionsCursor.opacity = lerp(optionsCursor.opacity, optionsState.cursorProps.opacity, optionsState.cursorProps.lerpValue)
		optionsCursor.scale = lerp(optionsCursor.scale, optionsState.cursorProps.scale, optionsState.cursorProps.lerpValue)
	})

	const pages = ["Controls", "Noteskins", "Etc"]
	pages.forEach((option, index) => {
		const initialY = 190
		const pageTextSize = 70
		const curPage = add([
			text(option, { size: pageTextSize, align: "left" }),
			pos(pageTextSize - 10, initialY + (pageTextSize * 1.25) * index),
			opacity(),
			anchor("left"),
			"pageText",
			{
				index: index,
			}
		])

		let targetOpacity = 1
		curPage.onUpdate(() => {
			if (optionsState.inPage) {
				if (optionsState.pageIndex == index) targetOpacity = 1
				else targetOpacity = 0.5
			}
			
			else {
				if (optionsState.pageIndex == index) targetOpacity = 0.5
				else targetOpacity = 0.25
			}

			curPage.opacity = lerp(curPage.opacity, targetOpacity, 0.5)
		})
	})

	manageOptionsState(optionsState.pageIndex, optionsState, false)

	onKeyPress("down", () => {
		if (!optionsState.inputEnabled) return
		
		if (optionsState.inPage) {
			optionsState.pageIndex = utils.scrollIndex(optionsState.pageIndex, 1, pages.length)
			manageOptionsState(optionsState.pageIndex, optionsState, false)
		}
	})
	
	onKeyPress("up", () => {
		if (!optionsState.inputEnabled) return
		
		if (optionsState.inPage) {
			optionsState.pageIndex = utils.scrollIndex(optionsState.pageIndex, -1, pages.length)
			manageOptionsState(optionsState.pageIndex, optionsState, false)
		}
	})

	onKeyPress("escape", () => {
		// is in page so i think they're done setting stuff
		if (!optionsState.inputEnabled) return
		
		if (optionsState.inPage) {
			goScene("songselect", { index: 0 } as paramsSongSelect)
			GameSave.save()
		}
		
		else {
			optionsState.inPage = true
			manageOptionsState(optionsState.pageIndex, optionsState, false)
		}
	})

	onKeyPress("enter", () => {
		if (!optionsState.inputEnabled) return
		
		if (optionsState.inPage == true) {
			optionsState.inPage = false
			// this will set the inPage value
			manageOptionsState(optionsState.pageIndex, optionsState, true)
		}
	})
})}