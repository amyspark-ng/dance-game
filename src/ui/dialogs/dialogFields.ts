import { Vec2 } from "kaplay";
import { gameDialog, gameDialogObj } from "./gameDialog";
import { playSound } from "../../core/plugins/features/sound";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { SongChart } from "../../play/song";

type textboxOpt = {
	title: string,
	dialog: gameDialogObj,
	position: Vec2,
	formatFunc?: (str:string) => string,
	conditionsForTyping: (str:string) => boolean,
	fallBackValue: string,
	startingValue: string,
}

/** Will return the object with some info
 * 
 * obj.value Will be the set value
 */
export function dialog_addTextbox(opts: textboxOpt) {
	const textSize = 30
	const padding = 5

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
			
			if (opts.conditionsForTyping(textbox.value + ch)) {
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