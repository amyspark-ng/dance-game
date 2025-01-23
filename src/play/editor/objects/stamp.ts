import { Color, Vec2 } from "kaplay";
import { Content } from "../../../core/loading/content";
import { utils } from "../../../utils";
import { ChartEvent } from "../../event";
import { ChartNote } from "../../objects/note";
import { StateChart } from "../EditorState";

function drawSelectSquare(editorStamp: EditorStamp, theColor: Color) {
	const sColor = theColor.lighten(150);

	let heightOfSelect = 0;
	if (editorStamp.is("note")) {
		heightOfSelect = editorStamp.height * (editorStamp.data.length ? editorStamp.data.length + 1 : 1);
	}
	else {
		heightOfSelect = editorStamp.height;
	}

	drawRect({
		width: editorStamp.width,
		height: heightOfSelect,
		anchor: "top",
		pos: vec2(editorStamp.pos.x, editorStamp.pos.y - editorStamp.height / 2),
		opacity: 0.5,
		color: sColor,
		outline: {
			width: 5,
			opacity: 1,
			color: sColor,
		},
	});
}

export class EditorStamp {
	step: number = 0;
	angle: number = 0;
	width: number = StateChart.SQUARE_SIZE.x;
	height: number = StateChart.SQUARE_SIZE.y;
	selected: boolean = false;
	scale: Vec2 = vec2(1);
	pos: Vec2 = vec2();
	type: "event" | "note";
	data: ChartNote | ChartEvent = null;

	// function overloading once again saving the day
	is(type: "note"): this is EditorNote;
	is(type: "event"): this is EditorEvent;
	is(type: "note" | "event") {
		if (type == "note") return "move" in this.data;
		else return "id" in this.data;
	}

	bop() {
		return tween(vec2(1.4), vec2(1), 0.1, (p) => this.scale = p);
	}

	twist() {
		return tween(choose([-1, 1]) * 20, 0, 0.5, (p) => this.angle = p, easings.easeOutExpo);
	}

	isHovering() {
		const screenPos = this.getScreenPos();
		const noteRect = new Rect(screenPos, this.width, this.height);
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

	draw() {
		return;
	}

	update() {
		if (this.type == "event") {
			this.pos = this.getPos().add(StateChart.SQUARE_SIZE.x, 0);
		}
		else {
			this.pos = this.getPos();
		}
		this.step = StateChart.instance.conductor.timeToStep(this.data.time);

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

	// protected means it will only be usable inside this class and the one that inherit from it
	protected getPos(lerping: boolean = true) {
		let stampPos = utils.getPosInGrid(StateChart.INITIAL_POS, this.step, 0, vec2(this.width, this.height));

		if (lerping == false) {
			stampPos.y -= StateChart.SQUARE_SIZE.y * StateChart.instance.scrollStep;
		}
		else {
			stampPos.y -= StateChart.SQUARE_SIZE.y * StateChart.instance.lerpScrollStep;
		}

		return stampPos;
	}

	protected getScreenPos() {
		return vec2(
			this.pos.x - StateChart.SQUARE_SIZE.x / 2,
			this.pos.y - StateChart.SQUARE_SIZE.y / 2,
		);
	}

	constructor(type: "note" | "event") {
		this.type = type;
		this.bop();
	}
}

export class EditorNote extends EditorStamp {
	override data: ChartNote = null;
	override draw() {
		// select stuff
		const opacity = StateChart.instance.conductor.timeInSeconds >= this.data.time ? 1 : 0.5;

		// actual drawing
		if (this.data.length) {
			// this draws the thing below the note
			drawSprite({
				width: this.width / 2,
				height: this.height,
				scale: this.scale,
				angle: 90 + this.angle,
				sprite: Content.getNoteskinSprite("trail", this.data.move),
				pos: this.pos,
				anchor: "center",
				opacity,
			});

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
			pos: this.pos,
			anchor: "center",
			opacity,
		});

		if (this.selected) {
			drawSelectSquare(this, BLUE);
		}
	}

	constructor(data: ChartNote) {
		super("note");
		this.data = data;
	}
}

export class EditorEvent extends EditorStamp {
	override data: ChartEvent = null;
	beingEdited: boolean = false;

	override draw() {
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
			drawSelectSquare(this, GREEN);
		}
		else if (this.selected) {
			drawSelectSquare(this, BLUE);
		}
	}
	constructor(data: ChartEvent) {
		super("event");
		this.data = data;
	}
}
