import { Vec2 } from "kaplay";
import { gameDialog, gameDialogObj } from "./gameDialog";
import { playSound } from "../../core/plugins/features/sound";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { SongChart } from "../../play/song";
import { dialog } from "@tauri-apps/api";
import { utils } from "../../utils";
import { StateChart } from "../../play/chartEditor/chartEditorBackend";
import { fileManager, handleCoverInput, handleSongInput } from "../../fileManaging";

const textSize = 30
const padding = 5

type textboxOpt = {
	title: string,
	dialog: gameDialogObj,
	position: Vec2,
	formatFunc?: (str:string) => string,
	conditionsForTyping: (currentSring: string, ch:string) => boolean,
	fallBackValue: string,
	startingValue: string,
}

/** Will return the object with some info
 * 
 * obj.value Will be the set value
 */
export function dialog_addTextbox(opts: textboxOpt) {
	const title = opts.dialog.add([
		text(opts.title + ":", { align: "right", size: textSize }),
		anchor("left"),
		pos(opts.position),
	])

	const textboxBg = opts.dialog.add([
		pos((title.pos.x + title.width) + padding, title.pos.y),
		rect(opts.dialog.width - title.width - padding * 14, textSize + padding, { radius: 2.5 }),
		color(opts.dialog.outline.color.lighten(5)),
		outline(1, opts.dialog.outline.color.lighten(20)),
		anchor("left"),
		area(),
	])
	
	/** Is the actual object that contains the value and the text */
	const textbox = opts.dialog.add([
		text("", { align: "left", size: textSize * 0.9 }),
		pos(textboxBg.pos.x + padding, textboxBg.pos.y),
		anchor("left"),
		"textbox",
		{
			value: opts.startingValue,
			focus: false,
			update() {
				this.text = opts.formatFunc(this.value)
			}
		}
	])

	textbox.onUpdate(() => {
		if (textbox.focus) {
			textboxBg.outline.color = lerp(textboxBg.outline.color, BLUE, 0.5)
		
			const textboxWorldPos = textbox.screenPos()
			gameCursor.pos.y = lerp(gameCursor.pos.y, textboxWorldPos.y - textbox.height / 2, 0.5)
			gameCursor.pos.x = lerp(gameCursor.pos.x, textboxWorldPos.x + textbox.width, 0.5)
		}
		
		else {
			textboxBg.outline.color = lerp(textboxBg.outline.color, opts.dialog.outline.color.lighten(20), 0.5)
		}
	})

	// sets to focused true
	textboxBg.onClick(() => {
		if (textbox.focus) return;
		// this will run if the textbox wasn't on focus

		textbox.focus = true
		gameCursor.typeMode = true
		gameDialog.canClose = false
		const charinputEv = textbox.onCharInput((ch) => {
			if (isKeyDown("shift")) ch = ch.toUpperCase()
			
			if (opts.conditionsForTyping(textbox.value, ch)) {
				textbox.value += ch
				playSound("keyClick", { detune: rand(-100, 100) })
			};
		})

		const backspaceEv = textbox.onKeyPressRepeat("backspace", () => {
			if (textbox.value.length == 0) return
			
			if (isKeyDown("control")) {
				// remove the last word
				if (textbox.value.split(" ").length == 1) textbox.value = ""
				else textbox.value = textbox.value.slice(0, textbox.value.lastIndexOf(" "))
			}

			else {
				textbox.value = textbox.value.slice(0, -1)
			}
			
			playSound("keyClick", { detune: rand(-100, 100) })
		})

		textboxBg.onUpdate(() => {
			if (!textbox.focus) return;
			
			if (isKeyPressed("enter") || isKeyPressed("escape")) {
				playSound("keyClick", { detune: rand(-100, 100) })
				charinputEv.cancel()
				backspaceEv.cancel()

				if (textbox.value.length == 0) textbox.value = opts.fallBackValue

				textbox.focus = false
				gameCursor.typeMode = false
				gameDialog.canClose = true
			}
		})
	})

	return textbox;
}

type sliderOpt = {
	title: string,
	dialog: gameDialogObj,
	position: Vec2,
	range: [number, number],
	initialValue: number,
}

export function dialog_addSlider(opts: sliderOpt) {
	const title = opts.dialog.add([
		text(opts.title + ":", { align: "left", size: 30 }),
		pos(opts.position),
	])
	
	const sliderbg = opts.dialog.add([
		pos(title.pos.x + title.width, (title.pos.y + title.height / 2) + 2),
		rect((opts.dialog.width - title.width - padding * 14) + 2, title.height / 2, { radius: 2.5 }),
		anchor("left"),
		color(opts.dialog.outline.color.lighten(5))
	])

	// TODO: Add the slider thing where the part on the left is colored blue so you know how much you've slided
	const slider = opts.dialog.add([
		pos(0, sliderbg.pos.y),
		rect(10, textSize + 5, { radius: 2.5 }),
		anchor("center"),
		area({ scale: vec2(2) }),
		"slider",
		{
			dragging: false,
			value: opts.initialValue,
		}
	])

	slider.onClick(() => {
		slider.dragging = true
	})

	slider.onMouseRelease(() => {
		if (!slider.dragging) return;
		slider.dragging = false
	})

	const leftX = sliderbg.pos.x + 10
	const rightX = (sliderbg.pos.x + sliderbg.width) - 10
	slider.onUpdate(() => {
		if (slider.dragging) {
			// i need to convert the mousepos to be local to the slider
			// i don't know how i did this
			const mousePosThing = gameCursor.toOther(slider, slider.pos)
			slider.pos.x = lerp(slider.pos.x, mousePosThing.x, 0.5)
			slider.pos.x = clamp(slider.pos.x, leftX, rightX)
			const mappedValue = map(slider.pos.x, leftX, rightX, opts.range[0], opts.range[1])
			slider.value = mappedValue, 0.5
		}
		
		else {
			const mappedXPos = map(slider.value, opts.range[0], opts.range[1], leftX, rightX)
			slider.pos.x = lerp(slider.pos.x, mappedXPos, 0.5)
		}
	})

	const valueText = opts.dialog.add([
		text("", { align: "left", font: "lambda", size: textSize * 0.8 }),
		anchor("left"),
		pos(sliderbg.pos.x + sliderbg.width + padding, sliderbg.pos.y),
		{
			update() {
				this.text = utils.formatNumber(slider.value, { type: "decimal" }) + "x"
			}
		}
	])

	return slider
}

type changeThingOpt = {
	position: Vec2,
	dialog: gameDialogObj,
	ChartState:StateChart,
}

export function dialog_changeCover(opts: changeThingOpt) {
	const isCoverLoaded = getSprite(opts.ChartState.song.idTitle + "-cover")
	let spriteForCover:string = undefined
	
	if (isCoverLoaded) spriteForCover = opts.ChartState.song.idTitle + "-cover"
	else spriteForCover = "defaultCover"
	
	const button = opts.dialog.add([
		sprite(spriteForCover),
		pos(opts.position),
		anchor("left"),
		area(),
		"cover",
		{
			update() {
				button.width = 100
				button.height = 100
			}
		}
	])
	
	button.onDraw(() => {
		if (button.isHovering()) {
			drawRect({
				width: button.width,
				height: button.height,
				color: WHITE.darken(50),
				opacity: 0.5,
				anchor: button.anchor,
			})
		}
	})

	button.onClick(() => {
		handleCoverInput(opts.ChartState)
	})

	return button;
}

export function dialog_changeSong(opts:changeThingOpt) {
	const button = opts.dialog.add([
		sprite("changeSongBtn"),
		pos(opts.position),
		anchor("left"),
		area(),
		"cover",
		{
			update() {
				button.width = 100
				button.height = 100
			}
		}
	])
	
	button.onDraw(() => {
		if (button.isHovering()) {
			drawRect({
				width: button.width,
				height: button.height,
				color: WHITE.darken(50),
				opacity: 0.5,
				anchor: button.anchor,
			})
		}
	})

	button.onClick(() => {
		handleSongInput(opts.ChartState)
	})

	return button;
}