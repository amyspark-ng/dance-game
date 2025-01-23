import { Color, Vec2 } from "kaplay";
import { Content } from "../../../core/loading/content";
import { utils } from "../../../utils";
import { ChartEvent } from "../../event";
import { ChartNote } from "../../objects/note";
import { StateChart } from "../EditorState";

export class EditorStamp {
	private _step: number = 0;
	angle: number = 0;
	width: number = StateChart.SQUARE_SIZE.x;
	height: number = StateChart.SQUARE_SIZE.y;
	selected: boolean = false;
	scale: Vec2 = vec2(1);
	pos: Vec2 = vec2();
	type: "note" | "event";
	data: ChartNote | ChartEvent = null;

	set step(newStep: number) {
		this.data.time = StateChart.instance.conductor.stepToTime(newStep);
	}

	get step() {
		return this._step;
	}

	static mix(notes: EditorNote[], events: EditorEvent[]) {
		return [...notes, ...events];
	}

	drawSelectSquare(theColor: Color) {
		const sColor = theColor.lighten(150);

		let heightOfSelect = 0;
		if (this.is("note")) {
			heightOfSelect = this.height * (this.data.length ? this.data.length + 1 : 1);
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
	is(type: "note"): this is EditorNote;
	is(type: "event"): this is EditorEvent;
	is(type: "note" | "event") {
		if (type == "note") return "move" in this.data;
		else if (type == "event") return "id" in this.data;
	}

	/* BOP IT :) */
	bop() {
		return tween(vec2(1.4), vec2(1), 0.1, (p) => this.scale = p);
	}

	/* TWIST IT :) */
	twist() {
		return tween(choose([-1, 1]) * 20, 0, 0.5, (p) => this.angle = p, easings.easeOutExpo);
	}

	/* Twitch it? */
	twitch() {
		const randomOffset = vec2(choose([-10, 10]), choose([-10, 10]));
		return tween(this.intendedPos.add(randomOffset), this.intendedPos, 0.15, (p) => this.pos = p);
	}

	get screenPos() {
		return vec2(
			this.pos.x - this.width / 2,
			this.pos.y - this.height / 2,
		);
	}

	isHovering() {
		const noteRect = new Rect(this.screenPos, this.width, this.height);
		return noteRect.contains(mousePos());
	}

	onClick(action: (stamp: EditorStamp) => void) {
		// makes it so it only runs if it's this one stamp
		// this is very cool, thank you MF
		return getTreeRoot().on("stampClick", (stamp: EditorStamp) => {
			if (stamp == this) {
				action(stamp);
			}
		});
	}

	onHit(action: (stamp: EditorStamp) => void) {
		return getTreeRoot().on("stampHit", (stamp: EditorStamp) => {
			if (stamp == this) {
				action(stamp);
			}
		});
	}

	draw() {
		return;
	}

	update() {
		this.pos = this.intendedPos;
		this._step = StateChart.instance.conductor.timeToStep(this.data.time);

		if (isMousePressed("left")) {
			if (this.isHovering()) {
				if (!this.selected) this.selected = true;
				getTreeRoot().trigger("stampClick", this);
			}
			else {
				if (this.selected) this.selected = false;
			}
		}
	}

	get intendedPos() {
		const stampPos = utils.getPosInGrid(StateChart.INITIAL_POS, this.step, 0, vec2(this.width, this.height));
		stampPos.y -= this.height * StateChart.instance.lerpScrollStep;
		if (this.is("event")) stampPos.x += this.width;
		return stampPos;
	}

	destroy() {
		getTreeRoot().clearEvents();
	}

	constructor(type: "note" | "event") {
		this.type = type;
	}
}

export class EditorNote extends EditorStamp {
	override data: ChartNote = null;

	/** Determines wheter there's a trail at a certain step
	 * @param step The step to find the trail at
	 */
	static trailAtStep(step: number) {
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
			// this draws the thing below the note
			// drawSprite({
			// 	width: this.width / 2,
			// 	height: this.height,
			// 	scale: this.scale,
			// 	angle: 90 + this.angle,
			// 	sprite: Content.getNoteskinSprite("trail", this.data.move),
			// 	pos: this.pos,
			// 	anchor: "center",
			// 	opacity,
			// });

			// this runs note.length + 1 because the first one is the one below the actual note
			for (let i = 0; i < this.data.length; i++) {
				// this draws the trail || tail
				drawSprite({
					width: this.width,
					height: this.height,
					scale: this.scale,
					angle: 90,
					sprite: Content.getNoteskinSprite(i == this.data.length - 1 ? "tail" : "trail", this.data.move),
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
			sprite: Content.getNoteskinSprite(this.data.move),
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

		if (StateChart.instance.conductor.currentStep == this.step) {
			this.scale = lerp(this.scale, vec2(1.2), 0.5);
		}
		else {
			this.scale = lerp(this.scale, vec2(1), 0.5);
		}
	}

	constructor(data: ChartNote) {
		super("note");
		this.data = data;
		this.update();
	}
}

export class EditorEvent extends EditorStamp {
	override data: ChartEvent = null;
	beingEdited: boolean = false;

	override update(): void {
		super.update();

		// TODO: Do it so it also works with long notes
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
			width: this.width,
			height: this.height,
			scale: this.scale,
			angle: this.angle,
			sprite: this.data.id,
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
