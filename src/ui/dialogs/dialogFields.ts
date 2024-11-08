import { Vec2 } from "kaplay";
import { gameDialog, gameDialogObj } from "./gameDialog";

type textboxOpt = {
	title: string,
	dialog: gameDialogObj,
	position: Vec2,
	formatFunc?: (str:string) => string
}

/** Will return the object with some info
 * 
 * obj.value Will be the set value
 * TODO: have to figure out which will be the inputted and which will be the formatted one and which will be 
 * The one that is set to the values of the song
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
		rect(opts.dialog.width - title.width - padding, textSize + padding, { radius: 2.5 }),
		color(opts.dialog.outline.color.lighten(5)),
		outline(1, opts.dialog.outline.color.lighten(20)),
		anchor("left"),
		area(),
	])
	
	const textbox = opts.dialog.add([
		text("", { align: "left", size: textSize * 0.9 }),
		pos(textboxBg.pos.x + padding, textboxBg.pos.y),
		anchor("left"),
		{
			value: "Cool Song",
			focus: false,
			update() {
				this.text = opts.formatFunc(this.value)
			}
		}
	])

	textbox.onUpdate(() => {
		if (textbox.focus) {
			textboxBg.outline.color = lerp(textboxBg.outline.color, BLUE, 0.5)
			gameDialog.canClose = false
		}

		else {
			textboxBg.outline.color = lerp(textboxBg.outline.color, opts.dialog.outline.color.lighten(20), 0.5)
			gameDialog.canClose = true
		}
	})

	textboxBg.onClick(() => {
		if (!textbox.focus) {
			textbox.focus = true
			const charinputEv = onCharInput((ch) => {
				if (isKeyDown("shift")) ch = ch.toUpperCase()
				textbox.value += ch
			})

			const backspaceEv = onKeyPress("backspace", () => {
				textbox.value = textbox.value.slice(0, -1)
			})

			textboxBg.onUpdate(() => {
				if (isKeyPressed("enter") || isKeyPressed("escape")) {
					charinputEv.cancel()
					backspaceEv.cancel()

					textbox.focus = false
					gameDialog.canClose = true
				}
			})
		}
	})

	return textbox;
}