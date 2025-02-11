import { DrawRectOpt, GameObj, Vec2 } from "kaplay";
import { utils } from "../../../utils";
import { ChartNote } from "../../objects/note";
import { EditorState } from "../EditorState";
import { EditorStamp } from "./stamp";

function makeMinimapObj() {
	return make([
		pos(),
		rect(0, 0),
		area(),
		opacity(0),
		anchor("top"),
		"hover",
	]);
}

export class EditorMinimap {
	pos: Vec2 = vec2();
	controller = {
		y: 0,
		opacity: 0.5,
		height: EditorState.SQUARE_SIZE.y,
	};

	/** How big a note is depending on the amount of total steps */
	sizeOfNote: Vec2 = vec2();
	canMove: boolean = false;
	height: number = height();
	width: number = EditorState.SQUARE_SIZE.x;
	isMoving: boolean = false;

	obj: ReturnType<typeof makeMinimapObj> = null;

	private update() {
		const state = EditorState.instance;
		const minLeft = this.pos.x - this.width / 2;
		const maxRight = this.pos.x + this.width / 2;

		this.sizeOfNote = vec2(EditorState.SQUARE_SIZE.x / 2, height() / state.conductor.totalSteps);
		this.controller.height = this.sizeOfNote.y * EditorState.SQUARES_IN_SCREEN;

		if (utils.isInRange(mousePos().x, minLeft, maxRight)) this.canMove = true;
		else {
			if (!this.isMoving) this.canMove = false;
		}

		// if you can move
		if (this.canMove) {
			if (isMousePressed("left")) {
				this.isMoving = true;
				if (!state.paused) state.paused = true;
			}
			else if (isMouseReleased("left") && this.isMoving) {
				this.isMoving = false;
			}

			// if you're moving
			if (this.isMoving) {
				// the pos of the controller will be the pos of the mouse
				this.controller.y = mousePos().y;
				this.controller.y = clamp(this.controller.y, 0, height() - this.controller.height);

				// and the step will be mapped to the pos of the controller
				const newStep = mapc(
					this.controller.y,
					0, // min range value
					height() - this.controller.height, // max range value
					0, // min result value
					state.conductor.totalSteps, // max result value
				);

				state.scrollToStep(newStep);
				this.controller.opacity = 0.5;
			}
		}

		// if you're not moving anything the pos of the controller will be mapped to the current scrollstep
		if (!this.isMoving) {
			this.controller.y = map(
				state.scrollStep,
				0, // min range value
				state.conductor.totalSteps, // max range value
				0, // min result value
				this.height - this.controller.height, // max result value
			);

			this.controller.opacity = 0.25;
		}
	}

	private draw() {
		const state = EditorState.instance;

		// draws the minimap background
		drawRect({
			width: EditorState.SQUARE_SIZE.x,
			height: this.height,
			color: BLACK.lerp(WHITE, 0.5),
			pos: this.pos,
			anchor: "top",
		});

		const stamps = EditorStamp.mix(state.notes, state.events);
		stamps.forEach((stamp) => {
			let xPos = this.pos.x;
			if (stamp.is("note")) xPos -= this.sizeOfNote.x;
			const yPos = map(stamp.step, 0, state.conductor.totalSteps, 0, height() - this.sizeOfNote.y);

			let theColor = stamp.is("note") ? ChartNote.moveToColor(stamp.data.move) : BLACK.lerp(WHITE, 0.25);
			if (stamp.selected) theColor = state.selectionBox.color;

			const drawOpts = {
				width: this.sizeOfNote.x,
				height: this.sizeOfNote.y,
				color: theColor,
				anchor: "topleft",
				pos: vec2(xPos, yPos),
				opacity: 0.5,
			} as DrawRectOpt;

			drawRect(drawOpts);
			if (!stamp.is("note")) return;
			if (!stamp.data.length) return;

			drawRect({
				width: drawOpts.width / 2,
				height: drawOpts.height * stamp.data.length,
				color: theColor,
				anchor: "top",
				pos: vec2(xPos + this.sizeOfNote.x / 2, yPos),
				opacity: drawOpts.opacity,
				outline: drawOpts.outline,
			});
		});

		// draw strumline
		drawRect({
			width: EditorState.SQUARE_SIZE.x,
			height: this.sizeOfNote.y,
			opacity: 0.5,
			color: RED,
			anchor: "top",
			scale: state.strumlineScale,
			pos: vec2(this.pos.x, this.controller.y + (this.sizeOfNote.y * state.strumlineStep)),
		});

		// draws the minimap controller
		drawRect({
			width: this.width,
			height: this.controller.height,
			anchor: "top",
			pos: vec2(this.pos.x, this.controller.y),
			opacity: this.controller.opacity,
			color: YELLOW,
			outline: {
				width: 5,
				color: utils.blendColors(RED, YELLOW, 0.5),
			},
		});

		if (state.selectionBox.isSelecting) {
			// // get height in steps
			// const heightInSteps = state.selectionBox.height / StateChart.SQUARE_SIZE.y;
			// // then every step would be 1 sizeOfNote
			// const scaledHeight = this.sizeOfNote.y * heightInSteps;

			// const x = this.pos.x;

			// const y = Math.min(state.selectionBox.lastClickPos.y, state.selectionBox.pos.y);
			// debug.log(y);

			// TODO: Draw the selection box :()

			// drawRect({
			// 	width: this.width,
			// 	height: this.height,
			// 	pos: vec2(this.pos.x, this.pos.y),
			// 	color: this.color,
			// 	opacity: 0.25,
			// 	outline: {
			// 		color: this.color,
			// 		width: 5,
			// 	},
			// });

			// drawRect({
			// 	pos: vec2(x, y),
			// 	width: this.width,
			// 	height: scaledHeight,
			// });
		}
	}

	constructor() {
		this.obj = add(makeMinimapObj());
		this.obj.onUpdate(() => {
			this.width = EditorState.SQUARE_SIZE.x;
			this.height = EditorState.SQUARE_SIZE.y * EditorState.SQUARES_IN_SCREEN;

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
}
