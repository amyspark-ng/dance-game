import { Vec2 } from "kaplay";
import { getCurNoteskin } from "../../../data/noteskins";
import { Move } from "../../objects/dancer";
import { ChartNote } from "../../objects/note";
import { ChartSnapshot, EditorState } from "../EditorState";

function makeLaneObj() {
	return make([
		pos(),
		rect(0, 0),
		area(),
		opacity(0),
		anchor("top"),
		"hover",
	]);
}

export class EditorLane {
	type: "note" | "event";
	pos: Vec2 = vec2(width() / 2, 0);
	width: number = EditorState.SQUARE_SIZE.x;
	height: number = EditorState.SQUARE_SIZE.y;
	angle: number = 0;
	onClick(button: "left" | "right" | "middle" = "left", action: () => void) {
		if (button == "left") return this.obj.onClick(action);
		else {
			return this.obj.onMousePress(button, () => {
				if (this.isHovering()) action();
			});
		}
	}

	static cursorPos: Vec2 = vec2();
	static lerpCursorPos: Vec2 = vec2();

	isHovering() {
		return this.obj.isHovering();
	}

	obj: ReturnType<typeof makeLaneObj>;

	lightColor = WHITE.darken(100).darken(10);
	darkColor = WHITE.darken(100).darken(50);

	update() {
	}

	draw() {
		const state = EditorState.instance;

		for (let i = 0; i < state.conductor.totalSteps; i++) {
			const newPos = vec2(this.pos.x, this.pos.y + EditorState.utils.stepToPos(i).y);
			newPos.y -= EditorState.SQUARE_SIZE.y * EditorState.instance.lerpScrollStep;

			const col = i % 2 == 0 ? this.lightColor : this.darkColor;

			// draws the background chess board squares etc
			if (EditorState.utils.renderingConditions(newPos.y)) {
				// note square
				drawRect({
					width: EditorState.SQUARE_SIZE.x,
					height: EditorState.SQUARE_SIZE.y,
					color: col,
					pos: vec2(newPos.x, newPos.y),
					anchor: "center",
				});
			}

			// draws a line on every beat
			if (i % state.conductor.stepsPerBeat == 0) {
				if (EditorState.utils.renderingConditions(newPos.y)) {
					// line beat
					drawRect({
						width: EditorState.SQUARE_SIZE.x,
						height: 5,
						color: this.darkColor.darken(70),
						anchor: "left",
						pos: vec2(
							newPos.x - EditorState.SQUARE_SIZE.x / 2,
							newPos.y - EditorState.SQUARE_SIZE.y / 2 - 2.5,
						),
					});
				}
			}
		}
	}

	constructor() {
		this.obj = add(makeLaneObj());
		this.obj.onUpdate(() => {
			this.width = EditorState.SQUARE_SIZE.x;
			this.height = EditorState.SQUARE_SIZE.y * 11;

			this.obj.width = this.width;
			this.obj.height = this.height;
			this.obj.pos = this.pos;
			this.update();
		});

		const STUPIDTHING = onDraw(() => {
			this.draw();
		});

		this.obj.onDestroy(() => {
			STUPIDTHING.cancel();
		});
	}

	static drawCursor() {
		const isInNotelane = EditorState.instance.isInNoteLane;
		const isInEventLane = EditorState.instance.isInEventLane;
		if (!(isInNotelane || isInEventLane)) return;

		const stepThing = EditorState.utils.stepToPos(EditorState.instance.hoveredStep - EditorState.instance.scrollStep);
		if (isInEventLane) this.cursorPos = stepThing.add(EditorState.SQUARE_SIZE.x, 0);
		else this.cursorPos = stepThing;
		this.lerpCursorPos = lerp(this.lerpCursorPos, this.cursorPos, 0.5);

		const noteOrEventAtStep = EditorState.utils.find("note", EditorState.instance.hoveredStep) || EditorState.utils.find("event", EditorState.instance.hoveredStep);

		// if no note at step
		if (!noteOrEventAtStep) {
			drawSprite({
				sprite: isInNotelane ? getCurNoteskin().getAnim(EditorState.instance.currentMove) : EditorState.instance.currentEvent,
				width: EditorState.SQUARE_SIZE.x - 5,
				height: EditorState.SQUARE_SIZE.y - 5,
				opacity: wave(0.5, 0.75, time() % 5),
				pos: this.lerpCursorPos,
				angle: wave(-1, 1, time() * 10),
				anchor: "center",
				fixed: true,
			});
		}

		// drawRect({
		// 	width: StateChart.SQUARE_SIZE.x - 5,
		// 	height: StateChart.SQUARE_SIZE.y - 5,
		// 	fill: false,
		// 	outline: {
		// 		width: 5,
		// 		color: theColor,
		// 		opacity: 1,
		// 		cap: "round",
		// 		join: "round",
		// 	},
		// 	radius: 3,
		// 	pos: this.lerpCursorPos,
		// 	anchor: "center",
		// 	fixed: true,
		// });
	}
}

export class NoteLane extends EditorLane {
	move: Move | "any" = "any";

	override update() {
	}

	override draw() {
		super.draw();

		for (let i = 0; i < EditorState.instance.conductor.totalSteps; i++) {
			if (i % EditorState.instance.conductor.stepsPerBeat == 0) {
				const newPos = EditorState.utils.stepToPos(i);
				newPos.y -= EditorState.SQUARE_SIZE.y * EditorState.instance.lerpScrollStep;

				if (EditorState.utils.renderingConditions(newPos.y)) {
					// the beat text
					drawText({
						text: `${i / EditorState.instance.conductor.stepsPerBeat}`,
						color: WHITE,
						size: EditorState.SQUARE_SIZE.x / 2,
						anchor: "center",
						pos: vec2(newPos.x - EditorState.SQUARE_SIZE.x, newPos.y),
					});
				}
			}
		}
	}

	constructor(move: Move | "any") {
		super();
		this.move = move;
	}
}

export class EventLane extends EditorLane {
	constructor() {
		super();
	}
}
