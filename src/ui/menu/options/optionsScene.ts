import { KEventController, Key, Vec2 } from "kaplay";
import { GameSave, GameSaveClass } from "../../../core/gamesave";
import { goScene } from "../../../core/scenes"
import { utils } from "../../../utils";
import { paramsSongSelect } from "../../songselectscene"
import { noteskins } from "../../../core/loader";
import { juice } from "../../../core/plugins/graphics/juiceComponent";
import { makeCheckbox, makeVolumeSlider } from "./optionsUI";
import { appWindow } from "@tauri-apps/api/window";

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

class StateOptions {
	/** The current ui element in the current page */
	optionIndex: number = 0;
	
	/** The current "page" will either be 0, 1 or 2 referring to controls, noteskins and etc */
	leftIndex: number = 0;

	/** Will be false when the player is choosing their new keys to play */
	inputEnabled: boolean = true;

	/** Wheter the player is on the left side, like changing the page of the options */
	inLeft: boolean = true;

	/** Some properties of the cursor */
	cursorProps = { 
		angle: 0,
		opacity: 1,
		pos: vec2(0),
		scale: vec2(1),
		lerpValue: 0.5,
	}

	/** Runs when pressing escape */
	exitAction() {
		// is in page so i think they're done setting stuff
		if (!this.inputEnabled) return

		if (this.inLeft) {
			goScene("songselect", { index: 0 } as paramsSongSelect)
			GameSave.save()
		}
		
		else {
			this.inLeft = true
			manageOptionsState(this.leftIndex, this, false)
		}
	}
}

/**
 * Manages the UI for the pages
 * @param page What page 
 * @param OptionsState The current state of the scene
 * @param workThem If work them is true then they should start working and not only be shown
 */
function manageOptionsState(page: number, OptionsState:StateOptions, workThem:boolean = false) {
	// NOTE: KEY INPUT EVENTS NEEDED FOR SPECIFIC OPTIONS SHOULD BE ATTACHED TO AN OBJECT IN THAT PAGE

	// tags for some elements
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
					let newKey:string = undefined

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

						if (newKey != undefined) {
							GameSave.preferences.gameControls[hoveredKey.curMove].kbKey = newKey
						}

						// so iskeypressed left and right can't run inmediately after choosing an arrow key
						wait(0.05, () => {
							OptionsState.inputEnabled = true
						})

						// does little anim
						tween(hoveredKey.pos.y - 10, hoveredKey.pos.y, 0.1, (p) => hoveredKey.pos.y = p, easings.easeOutQuad)
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
						if (ch == " " || ch == "+" || ch == "-" || ch == "") shake(1)
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

	// noteskins
	else if (page == 1) {
		const moves = ["left", "up", "down", "right"]

		OptionsState.optionIndex = noteskins.indexOf(GameSave.preferences.noteskin)
		if (OptionsState.optionIndex < 0) OptionsState.optionIndex = 0

		let canPressEnter = false
		wait(0.1, () => canPressEnter = true)

		const inputManager = add([tagForUI, tagForNoteskins])
		inputManager.onUpdate(() => {
			if (isKeyPressed("up")) OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, -1, noteskins.length)
			else if (isKeyPressed("down")) OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, 1, noteskins.length)
		
			else if (isKeyPressed("enter") && canPressEnter) {
				OptionsState.inLeft = true
				GameSave.preferences.noteskin = noteskins[OptionsState.optionIndex]
				GameSave.save()
				manageOptionsState(OptionsState.leftIndex, OptionsState, false)
			
				get("noteskinMov").forEach((obj) => {
					if (obj.noteskinIndex == OptionsState.optionIndex) obj.bop({
						startScale: vec2(1.2),
						endScale: vec2(1),
					})
				})
			}

			const noteskinMov = get("noteskinMov").find((obj) => obj.noteskinIndex == OptionsState.optionIndex && obj.movIndex == 3)
			if (noteskinMov != undefined) {
				OptionsState.cursorProps.pos.y = noteskinMov.pos.y
				OptionsState.cursorProps.pos.x = noteskinMov.pos.x + 90
				OptionsState.cursorProps.angle = 180
			}
		})

		const initialPos = vec2(width() / 2, height() / 2)
		noteskins.forEach((curNoteskin, noteskinIndex) => {
			moves.forEach((curMove, movIndex) => {
				const thePos = utils.getPosInGrid(initialPos, noteskinIndex, movIndex, vec2(90))

				const movenoteskin = add([
					sprite(curNoteskin + "_" + curMove),
					pos(thePos),
					anchor("center"),
					opacity(),
					scale(),
					juice(),
					"noteskinMov",
					tagForUI,
					tagForNoteskins,
					{
						movIndex: movIndex,
						noteskinIndex: noteskinIndex
					}
				])

				movenoteskin.onUpdate(() => {
					if (!OptionsState.inLeft) {
						if (OptionsState.optionIndex == noteskinIndex) movenoteskin.opacity = 1
						else movenoteskin.opacity = 0.5
					}
				})
			})
		})
	}

	// etc
	else if (page == 2) {
		let inDesktop = false
		utils.runInDesktop(() => inDesktop = true)
		
		const initialY = center().y - 100

		OptionsState.optionIndex = 0
		let canPressEnter = false
		wait(0.1, () => canPressEnter = true)

		const volumeSliders = [ makeVolumeSlider(), makeVolumeSlider(), makeVolumeSlider() ]
		const checkboxes = [ makeCheckbox() ]
		utils.runInDesktop(() => {
			// adds the fullscreen checkbox
			checkboxes.push(makeCheckbox())
		})

		const inputHandler = add([
			tagForUI,
			tagForEtc,
		])

		inputHandler.onUpdate(() => {
			if (OptionsState.inLeft) return

			if (isKeyPressed("down")) OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, 1, checkboxes.length)
			if (isKeyPressed("up")) OptionsState.optionIndex = utils.scrollIndex(OptionsState.optionIndex, -1, checkboxes.length)
		
			const hoveredObj = get(tagForEtc).find((obj) => obj.index == OptionsState.optionIndex)
			if (hoveredObj != undefined) {
				if (hoveredObj.is("checkbox")) {
					OptionsState.cursorProps.pos.y = hoveredObj.pos.y
					OptionsState.cursorProps.pos.x = hoveredObj.pos.x - hoveredObj.width * 1.2
				
					if (isKeyPressed("enter") && canPressEnter) {
						hoveredObj.check()
					}
				}
			}
		})
		
		volumeSliders.forEach((slider, index) => {
			const rectangle = add(slider.rect)
			const cursor = add(slider.cursor)

			rectangle.use(tagForUI)
			cursor.use(tagForUI)
			cursor.index = index

			rectangle.use(tagForEtc)
			cursor.use(tagForEtc)
		})

		checkboxes.forEach((madeObj, index) => {
			const obj = add(madeObj)
			
			obj.use(tagForUI)
			obj.use(tagForEtc)

			obj.index = index
			obj.pos.x = center().x + 60
			obj.pos.y = (initialY + initialY * index) + (50 * volumeSliders.length)

			// fullscreen checkbox
			if (inDesktop && obj.index == 0) {
				obj.onCheck((checked:boolean) => {
					GameSave.preferences.fullscreen = checked
					appWindow.setFullscreen(GameSave.preferences.fullscreen)
				})

				obj.onUpdate(() => {
					if (GameSave.preferences.fullscreen) obj.color = GREEN
					else obj.color = RED
				})
			}

			// funky textbox (for testing)
			else if ((obj.index == 0 && !inDesktop) || (obj.index == 1 && inDesktop)) {
				obj.onCheck((checked:boolean) => {
					debug.log("grooving: " + checked ? "on" : "off")
				})
			}
			
			obj.onUpdate(() => {
				if (OptionsState.inLeft) return;
				
				if (obj.index == OptionsState.optionIndex) obj.opacity = 1
				else obj.opacity = 0.5
			})
		})

		const fullscreenCheckbox = makeCheckbox()
		fullscreenCheckbox.use(tagForUI)
		fullscreenCheckbox.use(tagForEtc)
		fullscreenCheckbox.selected = isFullscreen()
		fullscreenCheckbox.pos = vec2(center().x + 300, center().y)

		get(tagForEtc).forEach((etcObj, index) => {
			etcObj.onUpdate(() => {
				if (!OptionsState.inLeft) return

				if (OptionsState.optionIndex == index) etcObj.opacity = 1
				else etcObj.opacity = 0.5
			})
		})

		fullscreenCheckbox.onCheck((checked) => {
			setFullscreen(checked)
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
		if (optionsState.inLeft) {
			const hoveredPage = get("pageText").find(page => page.index == optionsState.leftIndex)
	
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
			if (optionsState.inLeft) {
				if (optionsState.leftIndex == index) targetOpacity = 1
				else targetOpacity = 0.5
			}
			
			else {
				if (optionsState.leftIndex == index) targetOpacity = 0.5
				else targetOpacity = 0.25
			}

			curPage.opacity = lerp(curPage.opacity, targetOpacity, 0.5)
		})
	})

	manageOptionsState(optionsState.leftIndex, optionsState, false)

	onKeyPress("down", () => {
		if (!optionsState.inputEnabled) return
		
		if (optionsState.inLeft) {
			optionsState.leftIndex = utils.scrollIndex(optionsState.leftIndex, 1, pages.length)
			manageOptionsState(optionsState.leftIndex, optionsState, false)
		}
	})
	
	onKeyPress("up", () => {
		if (!optionsState.inputEnabled) return
		
		if (optionsState.inLeft) {
			optionsState.leftIndex = utils.scrollIndex(optionsState.leftIndex, -1, pages.length)
			manageOptionsState(optionsState.leftIndex, optionsState, false)
		}
	})

	onKeyPress("escape", () => {
		optionsState.exitAction()
	})

	onKeyPress("enter", () => {
		if (!optionsState.inputEnabled) return
		
		if (optionsState.inLeft == true) {
			optionsState.inLeft = false
			// this will set the inPage value
			manageOptionsState(optionsState.leftIndex, optionsState, true)
		}
	})

	onSceneLeave(() => {
		// just in case
		GameSave.save()
	})
})}