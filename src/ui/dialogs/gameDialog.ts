import { Comp, GameObj, KEventController, KEventHandler, RectComp } from "kaplay";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { playSound } from "../../core/plugins/features/sound";
import { dialog } from "@tauri-apps/api";
import { dialog_addTextbox } from "./dialogFields";
import { StateChart } from "../../play/chartEditor/chartEditorBackend";
import { utils } from "../../utils";
import { SongChart } from "../../play/song";
import { format } from "path";

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
			},
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
export class gameDialog {
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

		this.currentDialogue.onKeyPress("escape", () => {
			if (!this.canClose) return
			this.closeDialog()
		})

		this.currentDialogue.on("xClose", () => {
			if (!this.canClose) return
			this.closeDialog()
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

/** Opens the dialog for the fields of the song in the chart editor */
export function openChartInfoDialog(ChartState:StateChart) {
	const newSong = new SongChart()
	const leftPadding = 10
	
	const dialog = gameDialog.openDialog({
		width: 600,
		height: 300,
	})

	const nameBox = {
		name: "Name",
		formatFunc: (str:string) => str,
		conditionsForTyping: (str:string) => true,
		fallBackValue: newSong.title,
		startingValue: ChartState.song.title
	}

	const bpmBox = {
		name: "Starting BPM",
		formatFunc: (str: string) => {
			const bpm = parseInt(str)
			if (isNaN(bpm)) return "1"
			// short it to 3 characters long
			else return bpm.toString()
		},
		conditionsForTyping: (str: string) => {
			return !isNaN(parseInt(str)) && str.length <= 3
		},
		fallBackValue: newSong.bpm.toString(),
		startingValue: ChartState.song.bpm.toString(),
	}

	const textboxesOpts = [ nameBox, bpmBox ]

	const textboxes:ReturnType<typeof dialog_addTextbox>[] = []

	const xPos = -(dialog.width / 2) + leftPadding
	const ySpacing = 50
	const initialYPos = -dialog.height / 2 + ySpacing / 1.5
	textboxesOpts.forEach((opts, index) => {
		const textbox = dialog_addTextbox({
			dialog: dialog,
			title: opts.name,
			position: vec2(xPos, initialYPos + ySpacing * index),
			formatFunc: opts.formatFunc,
			fallBackValue: opts.fallBackValue,
			startingValue: opts.startingValue,
			conditionsForTyping: opts.conditionsForTyping,
		})
	
		textboxes[index] = textbox
	})

	dialog.onUpdate(() => {
		const nameTextbox = textboxes[0]
		if (nameTextbox.focus) ChartState.song.title = nameTextbox.value
		else nameTextbox.value = ChartState.song.title
		ChartState.song.idTitle = utils.kebabCase(ChartState.song.title)

		const bpmTextbox = textboxes[1]
		if (bpmTextbox.focus) ChartState.song.bpm = parseInt(bpmTextbox.value)
		else bpmTextbox.value = ChartState.song.bpm.toString()
	})
}