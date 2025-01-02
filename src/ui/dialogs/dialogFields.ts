import { openSync } from "fs";
import { KEventController, Vec2 } from "kaplay";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { playSound } from "../../core/plugins/features/sound";
import { handleAudioInput, handleCoverInput } from "../../fileManaging";
import { StateChart } from "../../play/chartEditor/chartEditorBackend";
import { utils } from "../../utils";
import { GameDialog, gameDialogObj } from "./gameDialog";

const textSize = 30;
const padding = 5;

export type textboxOpt =
	& {
		title: string;
		dialog: gameDialogObj;
		position?: Vec2;
		/** How long can the textbox be (in characters) */
		length: number;
	}
	& (
		| { type: "string"; fallBackValue: string; startingValue: string; }
		| { type: "number"; fallBackValue: number; startingValue: number; }
	);

/** Adds a textbox to type things in the dialog
 * @returns The object that holds the REAL value to use
 */
export function dialog_addTextbox(opts: textboxOpt) {
	function isNumberTextBox(
		opt: textboxOpt,
	): opt is textboxOpt & { type: "number"; fallBackValue: number; startingValue: number; } {
		return opt.type === "number";
	}

	const title = opts.dialog.add([
		text(opts.title + ":", { align: "right", size: textSize }),
		anchor("left"),
		pos(opts.position),
	]);

	const widthOfText = formatText({ text: "A", size: textSize }).width;
	const widthOfBox = ((widthOfText * 0.8) * opts.length) + widthOfText * 2;

	const textboxBg = opts.dialog.add([
		pos((title.pos.x + title.width) + padding, title.pos.y),
		rect(widthOfBox, textSize + padding, { radius: 2.5 }),
		color(GameDialog.HEADER_COLOR.lighten(5)),
		outline(1, GameDialog.HEADER_COLOR.lighten(20)),
		anchor("left"),
		area(),
	]);

	/** The value we'll be using, which can be undefined or have some weird typing going on */
	let workingValue = String(opts.startingValue);

	let charInputEv: KEventController = null;
	let backspaceEv: KEventController = null;

	/** Is the actual object that contains the value and the text */
	const textbox = opts.dialog.add([
		text("", { align: "left", size: textSize * 0.9 }),
		pos(textboxBg.pos.x + padding, textboxBg.pos.y),
		anchor("left"),
		"textbox",
		{
			value: isNumberTextBox(opts) ? opts.startingValue : opts.startingValue,
			canClick: false,
			focus: false,
			widthOfBox: widthOfBox,
			update() {
				if (workingValue == "") this.value = opts.fallBackValue;
				else {
					if (isNumberTextBox(opts)) this.value = Number(workingValue);
					else this.value = String(workingValue);
				}

				this.text = workingValue.toString();
			},
		},
	]);

	textbox.onUpdate(() => {
		if (textbox.focus) {
			textboxBg.outline.color = lerp(textboxBg.outline.color, BLUE, 0.5);

			const textboxWorldPos = textbox.screenPos();
			gameCursor.pos.y = lerp(gameCursor.pos.y, textboxWorldPos.y - textbox.height / 2, 0.5);
			gameCursor.pos.x = lerp(gameCursor.pos.x, textboxWorldPos.x + textbox.width, 0.5);

			if (isKeyPressed("enter") || isKeyPressed("escape")) {
				if (workingValue == "") workingValue = String(opts.fallBackValue);
				playSound("keyClick", { detune: rand(-100, 100) });
				charInputEv.cancel();
				backspaceEv.cancel();

				textbox.focus = false;
				gameCursor.typeMode = false;
				GameDialog.canClose = true;
			}
		}
		else {
			textboxBg.outline.color = lerp(textboxBg.outline.color, GameDialog.HEADER_COLOR.lighten(20), 0.5);
		}
	});

	wait(0.1, () => {
		textbox.canClick = true;
	});

	// sets to focused true
	textboxBg.onClick(() => {
		if (!textbox.canClick) return;
		if (textbox.focus) return;
		// this will run if the textbox wasn't on focus

		textbox.focus = true;
		gameCursor.typeMode = true;
		GameDialog.canClose = false;

		// typing stuff
		charInputEv = textbox.onCharInput((ch) => {
			if (isNumberTextBox(opts)) {
				if (workingValue.length >= opts.length) return;
				if (isNaN(Number(ch))) return;
				workingValue += ch;
			}
			// string textbox
			else {
				if (isKeyDown("shift")) ch = ch.toUpperCase();
				if (workingValue.length >= opts.length) return;
				workingValue += ch;
			}

			playSound("keyClick", { detune: rand(-100, 100) });
		});

		backspaceEv = textbox.onKeyPressRepeat("backspace", () => {
			if (workingValue == "") return;

			if (isKeyDown("control")) {
				// remove the last word
				if (workingValue.split(" ").length == 1) workingValue = "";
				else workingValue = workingValue.slice(0, workingValue.lastIndexOf(" "));
			}
			else {
				workingValue = workingValue.slice(0, -1);
			}

			playSound("keyClick", { detune: rand(-100, 100) });
		});
	});

	return textbox;
}

type sliderOpt = {
	title: string;
	dialog: gameDialogObj;
	position: Vec2;
	range: [number, number];
	initialValue: number;
};

export function dialog_addSlider(opts: sliderOpt) {
	const title = opts.dialog.add([
		text(opts.title + ":", { align: "left", size: 30 }),
		pos(opts.position),
	]);

	const sliderbg = opts.dialog.add([
		pos(title.pos.x + title.width, (title.pos.y + title.height / 2) + 2),
		rect((opts.dialog.width - title.width - padding * 14) + 2, title.height / 2, { radius: 2.5 }),
		anchor("left"),
		color(GameDialog.HEADER_COLOR.lighten(5)),
	]);

	// TODO: Add the slider thing where the part on the left is colored blue so you know how much you've slided
	const sliderFull = opts.dialog.add([
		pos(title.pos.x + title.width, (title.pos.y + title.height / 2) + 2),
		rect(0, title.height / 2, { radius: 3 }),
		anchor("left"),
		color(BLUE.lighten(50)),
		z(0),
		{
			update() {
				this.width = (slider.pos.x + slider.width - sliderbg.pos.x) - 5;
			},
		},
	]);

	const slider = opts.dialog.add([
		pos(0, sliderbg.pos.y),
		rect(10, textSize + 5, { radius: 2.5 }),
		anchor("center"),
		area({ scale: vec2(2, 1) }),
		z(1),
		"slider",
		"hover",
		{
			dragging: false,
			value: opts.initialValue,
		},
	]);

	slider.onClick(() => {
		slider.dragging = true;
	});

	slider.onMouseRelease(() => {
		if (!slider.dragging) return;
		slider.dragging = false;
	});

	const leftX = sliderbg.pos.x + 10;
	const rightX = (sliderbg.pos.x + sliderbg.width) - 10;
	slider.onUpdate(() => {
		if (slider.dragging) {
			// i need to convert the mousepos to be local to the slider
			// i don't know how i did this
			const mousePosThing = gameCursor.toOther(slider, slider.pos);
			slider.pos.x = lerp(slider.pos.x, mousePosThing.x, 0.5);
			slider.pos.x = clamp(slider.pos.x, leftX, rightX);
			const mappedValue = map(slider.pos.x, leftX, rightX, opts.range[0], opts.range[1]);
			let oldValue = slider.value;
			slider.value = parseFloat(mappedValue.toFixed(1));

			// little thing for sound
			if (!isMouseMoved()) return;
			if (Math.round(slider.value) != Math.round(oldValue)) {
				playSound("noteMove", { detune: map(slider.value, opts.range[0], opts.range[1], -100, 100) });
			}
		}
		else {
			const mappedXPos = map(slider.value, opts.range[0], opts.range[1], leftX, rightX);
			slider.pos.x = lerp(slider.pos.x, mappedXPos, 0.5);
		}
	});

	const valueText = opts.dialog.add([
		text("", { align: "left", font: "lambda", size: textSize * 0.8 }),
		anchor("left"),
		pos(sliderbg.pos.x + sliderbg.width + padding, sliderbg.pos.y),
		{
			update() {
				this.text = utils.formatNumber(slider.value, { type: "decimal" }) + "x";
			},
		},
	]);

	return slider;
}

type changeThingOpt = {
	position: Vec2;
	dialog: gameDialogObj;
	ChartState: StateChart;
};

export function dialog_changeCover(opts: changeThingOpt) {
	const isCoverLoaded = getSprite(opts.ChartState.song.manifest.uuid_DONT_CHANGE + "-cover");
	let spriteForCover: string = undefined;

	if (isCoverLoaded) spriteForCover = opts.ChartState.song.manifest.uuid_DONT_CHANGE + "-cover";
	else spriteForCover = "defaultCover";

	const title = opts.dialog.add([
		text("Cover: ", { align: "right", size: textSize }),
		anchor("left"),
		pos(opts.position),
	]);

	const textboxBg = opts.dialog.add([
		pos((title.pos.x + title.width) + padding, title.pos.y),
		rect((opts.dialog.width - title.width - padding * 14) - 50, textSize + padding, { radius: 2.5 }),
		color(GameDialog.HEADER_COLOR.lighten(5)),
		outline(1, GameDialog.HEADER_COLOR.lighten(20)),
		anchor("left"),
		area(),
	]);

	/** Is the actual object that contains the value and the text */
	const textbox = opts.dialog.add([
		text("", { align: "left", size: textSize * 0.9 }),
		pos(textboxBg.pos.x + padding, textboxBg.pos.y),
		anchor("left"),
		"textbox",
		{
			value: opts.ChartState.song.manifest.cover_file,
			update() {
				if (this.value.length > 0) {
					const widthOfThisText = formatText({ text: this.text, size: this.textSize, align: "left" }).width
						+ textSize;
					textboxBg.width = lerp(textboxBg.width, widthOfThisText, 0.8);
				}

				this.value = opts.ChartState.song.manifest.cover_file;
				this.text = this.value;
			},
		},
	]);

	textboxBg.onClick(() => {
		handleCoverInput(opts.ChartState);
	});

	const coverSize = 100;
	opts.dialog.onDraw(() => {
		drawSprite({
			sprite: opts.ChartState.song.manifest.uuid_DONT_CHANGE + "-cover",
			width: coverSize,
			height: coverSize,
			pos: vec2(opts.dialog.width / 2 - coverSize, opts.dialog.height / 2 - (coverSize / 2) - padding),
			anchor: "center",
		});
	});

	return textbox;
}

export function dialog_changeSong(opts: changeThingOpt) {
	const title = opts.dialog.add([
		text("Audio: ", { align: "right", size: textSize }),
		anchor("left"),
		pos(opts.position),
	]);

	const textboxBg = opts.dialog.add([
		pos((title.pos.x + title.width) + padding, title.pos.y),
		rect(opts.dialog.width - title.width - padding * 14, textSize + padding, { radius: 2.5 }),
		color(GameDialog.HEADER_COLOR.lighten(5)),
		outline(1, GameDialog.HEADER_COLOR.lighten(20)),
		anchor("left"),
		area(),
	]);

	/** Is the actual object that contains the value and the text */
	const textbox = opts.dialog.add([
		text("", { align: "left", size: textSize * 0.9 }),
		pos(textboxBg.pos.x + padding, textboxBg.pos.y),
		anchor("left"),
		"textbox",
		{
			value: opts.ChartState.song.manifest.audio_file,
			update() {
				if (this.value.length > 0) {
					const widthOfThisText = formatText({ text: this.text, size: this.textSize, align: "left" }).width;
					textboxBg.width = lerp(textboxBg.width, widthOfThisText, 0.8);
				}

				this.value = opts.ChartState.song.manifest.audio_file;
				this.text = this.value;
			},
		},
	]);

	textbox.text;

	textboxBg.onClick(() => {
		handleAudioInput(opts.ChartState);
	});

	return textbox;
}

export type checkboxOpt = {
	title: string;
	dialog: gameDialogObj;
	position?: Vec2;
	startingValue: boolean;
};

export function dialog_addCheckbox(opts: checkboxOpt) {
	const title = opts.dialog.add([
		pos(opts.position),
		text(opts.title + ":", { align: "left", size: textSize }),
		anchor("left"),
	]);

	const checkbox = opts.dialog.add([
		pos(title.pos.x + title.width, title.pos.y),
		rect(textSize + padding, textSize + padding, { radius: 2.5 }),
		color(GameDialog.HEADER_COLOR.lighten(5)),
		outline(1, GameDialog.HEADER_COLOR.lighten(20)),
		anchor("left"),
		area(),
		"checkbox",
		{
			value: opts.startingValue,
			draw() {
				if (this.value == true) {
					drawRect({
						pos: vec2(checkbox.width / 2, 0),
						width: checkbox.width - 10,
						height: checkbox.height - 10,
						anchor: "center",
						color: WHITE.darken(5),
						radius: 2.5,
					});
				}
			},
		},
	]);

	checkbox.onClick(() => {
		checkbox.value = !checkbox.value;
	});

	return checkbox;
}
