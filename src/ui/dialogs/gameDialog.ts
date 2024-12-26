import { Color, Comp, GameObj, KEventController, KEventHandler, RectComp } from "kaplay";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { playSound } from "../../core/plugins/features/sound";
import { dialog } from "@tauri-apps/api";
import { dialog_addSlider, dialog_addTextbox, dialog_changeCover, dialog_changeSong } from "./dialogFields";
import { StateChart } from "../../play/chartEditor/chartEditorBackend";
import { utils } from "../../utils";
import { format } from "path";
import { ChartEvent, SongContent } from "../../play/song";

/** Adds the dialog square object */
function addDialogueThing(opts:openDialogOpts) {
	const FILL_COLOR = BLACK.lighten(50);
	const BORDER_COLOR = BLACK.lighten(70);
	
	const dialogObj = add([
		rect(opts.width, opts.height, { radius: 5 }),
		pos(center()),
		color(FILL_COLOR),
		anchor("center"),
		opacity(),
		z(100),
		scale(),
		outline(5, BORDER_COLOR),
		{
			close() {
				this.destroy()
				this.trigger("close")
			},

			onClose(action: () => void) {
				return this.on("close", action)
			}
		}
	])

	const xSize = 40
	const spaceForX = dialogObj.add([
		rect(xSize, xSize, { radius: 5 }),
		pos((dialogObj.width / 2) - xSize, -dialogObj.height / 2),
		color(BORDER_COLOR),
	])
	
	const xButton = spaceForX.add([
		text("X", { font: "lambdao", size: xSize * 0.9 }),
		pos(xSize * 0.2, 0),
		area(),
		color(),
	])

	xButton.onUpdate(() => {
		if (xButton.isHovering()) xButton.color = lerp(xButton.color, RED, 0.25)
		else xButton.color = lerp(xButton.color, WHITE, 0.25)
		if (xButton.isHovering() && isMousePressed("left")) dialogObj.trigger("xClose")
	})

	return dialogObj;
}

/** Type of the game dialog game object */
export type gameDialogObj = ReturnType<typeof addDialogueThing>
/** Options for the open dialog function */
type openDialogOpts = { width: number, height: number }

/** Class that handles dialogs for the game */
export class GameDialog {
	/** Wheter there's a dialog open */
	static isOpen: boolean = false;

	/** Wheter the game dialog can be closed */
	static canClose: boolean = true;

	/** Wheter the cursor is inside a dialog */
	static isInside: boolean = false;

	/** The gameobject of the current dialogue */
	static currentDialogue: gameDialogObj = null;
	
	/** Open a dialog */
	static openDialog(opts: openDialogOpts) {
		if (this.isOpen) return;
		this.isOpen = true;
		playSound("dialogOpen")
		getTreeRoot().trigger("dialogOpen")

		const startingPos = mousePos();

		const blackBg = add([
			rect(width(), height()),
			color(BLACK),
			opacity(0.55),
			pos(center()),
			anchor("center"),
		])

		blackBg.fadeIn(0.15)
		this.currentDialogue = addDialogueThing(opts);
		this.currentDialogue.onDestroy(() => {
			blackBg.destroy()
		})

		const lerpValue = 0.25
		this.currentDialogue.pos = startingPos;
		this.currentDialogue.scale = vec2(0)
		this.currentDialogue.onUpdate(() => {
			if (this.currentDialogue == null) return;
			this.currentDialogue.scale.x = lerp(this.currentDialogue.scale.x, 1, lerpValue)
			this.currentDialogue.scale.y = lerp(this.currentDialogue.scale.y, 1, lerpValue * 1.3)
			this.currentDialogue.pos.x = lerp(this.currentDialogue.pos.x, center().x, lerpValue)
			this.currentDialogue.pos.y = lerp(this.currentDialogue.pos.y, center().y, lerpValue * 1.3)
			
			const recty = new Rect(center().sub(vec2(opts.width / 2, opts.height / 2)), opts.width, opts.height)
			this.isInside = recty.contains(gameCursor.pos)
		})

		wait(0.05, () => {
			this.currentDialogue.onKeyPress("escape", () => {
				if (!this.canClose) return
				this.closeDialog()
			})
	
			this.currentDialogue.on("xClose", () => {
				if (!this.canClose) return
				this.closeDialog()
			})
		})

		return this.currentDialogue;
	};

	/** Closes the current open dialogue */
	static closeDialog() {
		playSound("dialogOpen", { detune: -50 }).speed = 0.9
		this.isOpen = false
		this.isInside = false
		this.currentDialogue.close()
		this.currentDialogue = null
	}
}


// adds a square notification to the bottom
export function addNotification(text: string, duration: number = 3, status: "Good" | "Error" | "Warning") {
	const notification = add([
		rect(400, 50),
		pos(0, -50),
		anchor("botleft"),
		opacity(0),
		z(1000),
		color(),
	])

	return notification;
}
