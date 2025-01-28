import { Color, Vec2 } from "kaplay";
import { CustomAudioPlay, Sound } from "../../../core/sound";
import { getNoteskinSprite } from "../../../data/noteskins";
import { utils } from "../../../utils";
import { ChartEvent } from "../../event";
import { ChartNote } from "../../objects/note";
import { StateChart } from "../EditorState";

/** Class for one of the notes or events in a ChartState
 *
 * Has many cool little props like selected step sounds, anim utils, etc
 */
export class EditorStamp {
	angle: number = 0;
	width: number = StateChart.SQUARE_SIZE.x;
	height: number = StateChart.SQUARE_SIZE.y;
	selected: boolean = false;
	scale: Vec2 = vec2(1);
	pos: Vec2 = vec2();
	type: "note" | "event";
	data: ChartNote | ChartEvent = null;

	events = new KEventHandler();

	set step(newStep: number) {
		this.data.time = StateChart.instance.conductor.stepToTime(newStep);
	}

	get step() {
		return Math.round(StateChart.instance.conductor.timeToStep(this.data.time));
	}

	static mix(notes: EditorNote[], events: EditorEvent[]) {
		return [...notes, ...events];
	}

	addSound() {
		return Sound.playSound("noteAdd");
	}

	deleteSound() {
		return Sound.playSound("noteDelete");
	}

	moveSound() {
		return Sound.playSound("noteMove");
	}

	drawSelectSquare(theColor: Color) {
		const sColor = theColor.lighten(150);

		let heightOfSelect = 0;
		if (this.is("note")) {
			heightOfSelect = this.height + this.trailHeight;
		}
		else {
			heightOfSelect = this.height;
		}

		drawRect({
			width: this.width,
			height: heightOfSelect,
			anchor: "top",
			pos: vec2(this.intendedPos.x, this.intendedPos.y - this.height / 2),
			opacity: 0.5,
			color: sColor,
			outline: {
				width: 5,
				opacity: 1,
				color: sColor,
			},
		});
	}

	// function overloading once again saving the day
	/** Wheter the stamp is a note or an event */
	is(type: "note"): this is EditorNote;
	is(type: "event"): this is EditorEvent;
	is(type: "note" | "event") {
		if (type == "note") return "move" in this.data;
		else return "id" in this.data;
	}

	/* BOP IT :) */
	bop() {
		// return tween(vec2(1.4), vec2(1), 0.1, (p) => this.scale = p);
	}

	/* TWIST IT :) */
	twist() {
		return tween(choose([-1, 1]) * 20, 0, 0.5, (p) => this.angle = p, easings.easeOutExpo);
	}

	/* Twitch it? */
	twitch(strength = 10) {
		const randomOffset = vec2(choose([-strength, strength]), choose([-strength, strength]));
		return tween(this.intendedPos.add(randomOffset), this.intendedPos, 0.15, (p) => this.pos = p);
	}

	/** The pos the stamp has on screen */
	get screenPos() {
		return vec2(
			this.pos.x - this.width / 2,
			this.pos.y - this.height / 2,
		);
	}

	/** Wheter the stamp is being hovered */
	isHovering() {
		return new Rect(this.screenPos, this.width, this.height).contains(mousePos());
	}

	/** Runs when the stamp is clicked */
	onClick(action: (stamp: EditorStamp) => void) {
		// makes it so it only runs if it's this one stamp
		// this is very cool, thank you MF
		return this.events.on("stampClick", (stamp: EditorStamp) => {
			if (stamp == this) {
				action(stamp);
			}
		});
	}

	/** Runs when the stamp is hit (on step) */
	onHit(action: (stamp: EditorStamp) => void) {
		return this.events.on("stampHit", (stamp: EditorStamp) => {
			if (stamp == this) {
				action(stamp);
			}
		});
	}

	/** The draw event of the stamp */
	draw() {
		return;
	}

	/** Update the state of the stamp */
	update() {
		this.pos = this.intendedPos;

		if (isMousePressed("left")) {
			if (this.isHovering()) {
				this.events.trigger("stampClick", this);
			}
		}
	}

	/** The pos the stamp should be */
	get intendedPos() {
		const stampPos = utils.getPosInGrid(StateChart.INITIAL_POS, this.step, 0, vec2(this.width, this.height));
		stampPos.y -= this.height * StateChart.instance.lerpScrollStep;
		if (this.is("event")) stampPos.x += this.width;
		return stampPos;
	}

	/** Runs when the stamp is removed (has to be called manually duh) */
	destroy() {
		this.events.clear();
	}

	constructor(type: "note" | "event") {
		this.type = type;
	}
}

/** Class for one of the notes in a ChartState */
export class EditorNote extends EditorStamp {
	override data: ChartNote = null;

	get trailHeight() {
		return this.height * (this.data.length ? this.data.length : 0);
	}

	/** Wheter the note is hovering
	 * @param includeTrail Wheter to also think of the trail
	 */
	override isHovering(includeTrail = false): boolean {
		return new Rect(this.screenPos, this.width, this.height + (includeTrail ? this.trailHeight : 0)).contains(mousePos());
	}

	override addSound() {
		const ogSound = super.addSound();
		ogSound.detune = ChartNote.moveToDetune(this.data.move);
		return ogSound;
	}

	override deleteSound() {
		const ogSound = super.deleteSound();
		ogSound.detune = -ChartNote.moveToDetune(this.data.move);
		return ogSound;
	}

	stretchSound() {
		const detune = this.data.length % 2 == 0 ? 0 : 100;
		Sound.playSound("noteStretch", { detune: detune });
	}

	snapSound() {
		return Sound.playSound("noteSnap", { detune: rand(-25, 25) });
	}

	override moveSound(): CustomAudioPlay {
		const ogSound = super.moveSound();
		ogSound.detune = Math.abs(ChartNote.moveToDetune(this.data.move)) * 0.5;
		return ogSound;
	}

	/** Determines wheter there's a trail at a certain step
	 * @param step The step to find the trail at
	 */
	static trailAtStep(step: number = StateChart.instance.hoveredStep) {
		const note = StateChart.utils.find("note", step);
		if (note) {
			const noteStep = Math.round(StateChart.instance.conductor.timeToStep(note.data.time));
			if (note.data.length) {
				return utils.isInRange(step, noteStep + 1, noteStep + 1 + note.data.length);
			}
			else return false;
		}
		else return false;
	}

	override draw() {
		const stampLengthIsInRange = EditorNote.trailAtStep(StateChart.instance.scrollStep);
		const canDraw = StateChart.utils.renderingConditions(this.pos.y) || stampLengthIsInRange;
		if (!canDraw) return;

		// select stuff
		const opacity = StateChart.instance.conductor.timeInSeconds >= this.data.time ? 1 : 0.5;

		// actual drawing
		if (this.data.length) {
			// this runs note.length + 1 because the first one is the one below the actual note
			for (let i = 0; i < this.data.length; i++) {
				// this draws the trail || tail
				drawSprite({
					width: this.width,
					height: this.height,
					scale: this.scale,
					angle: 90,
					sprite: getNoteskinSprite(i == this.data.length - 1 ? "tail" : "trail", this.data.move),
					pos: vec2(this.pos.x, this.pos.y + ((i + 1) * this.height)),
					anchor: "center",
					opacity,
				});
			}
		}

		// this draws the actual stamp (event or note)
		drawSprite({
			width: this.width,
			height: this.height,
			scale: this.scale,
			angle: this.angle,
			sprite: getNoteskinSprite(this.data.move),
			pos: vec2(this.pos.x, this.pos.y),
			anchor: "center",
			opacity,
		});

		if (this.selected) {
			this.drawSelectSquare(BLUE);
		}
	}

	override update() {
		super.update();

		if (StateChart.instance.scrollStep == this.step || this.data.length && utils.isInRange(StateChart.instance.scrollStep, this.step, this.step + this.data.length)) {
			this.scale = lerp(this.scale, vec2(1.2), 0.5);
		}
		else this.scale = lerp(this.scale, vec2(1), 0.5);
	}

	constructor(data: ChartNote) {
		super("note");
		this.data = data;
		this.update();
	}
}

/** Class for one of the events in a ChartState */
export class EditorEvent extends EditorStamp {
	override data: ChartEvent = null;
	beingEdited: boolean = false;

	override addSound() {
		Sound.playSound("eventCog", { detune: 10 * Object.keys(ChartEvent.eventSchema).indexOf(this.data.id) });
		const ogSound = super.addSound();
		ogSound.detune = rand(-50, 50);
		return ogSound;
	}

	override deleteSound() {
		Sound.playSound("eventCog", { detune: -(10 * Object.keys(ChartEvent.eventSchema).indexOf(this.data.id)) });
		const ogSound = super.deleteSound();
		ogSound.detune = rand(-50, 50);
		return ogSound;
	}

	editSound(): CustomAudioPlay {
		const cogSound = Sound.playSound("eventCog");
		tween(-100, rand(300, 400), cogSound.duration(), (p) => cogSound.detune = p, easings.easeOutExpo);
		return cogSound;
	}

	override moveSound(): CustomAudioPlay {
		const ogSound = super.moveSound();
		ogSound.detune = Object.keys(ChartEvent.eventSchema).indexOf(this.data.id) * 10;
		return ogSound;
	}

	override update(): void {
		super.update();

		if (StateChart.instance.conductor.currentStep == this.step) {
			this.scale = lerp(this.scale, vec2(1.1), 0.5);
		}
		else {
			this.scale = lerp(this.scale, vec2(1), 0.5);
		}
	}

	override draw() {
		if (!StateChart.utils.renderingConditions(this.intendedPos.y)) return;

		// select stuff
		const opacity = StateChart.instance.conductor.timeInSeconds >= this.data.time ? 1 : 0.5;
		// this draws the actual stamp (event or note)
		drawSprite({
			sprite: this.data.id ?? "hueSlider",
			width: this.width,
			height: this.height,
			scale: this.scale,
			angle: this.angle,
			pos: this.pos,
			anchor: "center",
			opacity,
		});

		if (this.beingEdited) {
			this.drawSelectSquare(GREEN);
		}
		else if (this.selected) {
			this.drawSelectSquare(BLUE);
		}
	}
	constructor(data: ChartEvent) {
		super("event");
		this.data = data;
		if (!this.data.value || Object.keys(this.data.value).length == 0) {
			this.data.value = ChartEvent.eventSchema[data.id];
		}
		this.update();
	}
}
