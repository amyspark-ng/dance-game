import { DrawRectOpt, GameObj, Vec2 } from "kaplay";
import { utils } from "../../../utils";
import { ChartNote } from "../../objects/note";
import { StateChart } from "../EditorState";
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
		height: StateChart.SQUARE_SIZE.y,
	};

	/** How big a note is depending on the amount of total steps */
	sizeOfNote: Vec2 = vec2();
	canMove: boolean = false;
	height: number = height();
	width: number = StateChart.SQUARE_SIZE.x;
	isMoving: boolean = false;

	obj: ReturnType<typeof makeMinimapObj> = null;

	private update() {
		const ChartState = StateChart.instance;
		const minLeft = this.pos.x - this.width / 2;
		const maxRight = this.pos.x + this.width / 2;

		this.sizeOfNote = vec2(StateChart.SQUARE_SIZE.x / 2, height() / ChartState.conductor.totalSteps);
		this.controller.height = this.sizeOfNote.y * 11;

		if (utils.isInRange(mousePos().x, minLeft, maxRight)) this.canMove = true;
		else {
			if (!this.isMoving) this.canMove = false;
		}

		// if you can move
		if (this.canMove) {
			if (isMousePressed("left")) {
				this.isMoving = true;
				if (!ChartState.paused) ChartState.paused = true;
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
					ChartState.conductor.totalSteps, // max result value
				);

				ChartState.scrollToStep(newStep);
				this.controller.opacity = 0.5;
			}
		}

		// if you're not moving anything the pos of the controller will be mapped to the current scrollstep
		if (!this.isMoving) {
			this.controller.y = map(
				ChartState.scrollStep,
				0, // min range value
				ChartState.conductor.totalSteps, // max range value
				0, // min result value
				this.height - this.controller.height, // max result value
			);

			this.controller.opacity = 0.25;
		}
	}

	private draw() {
		const ChartState = StateChart.instance;

		// draws the minimap background
		drawRect({
			width: StateChart.SQUARE_SIZE.x,
			height: this.height,
			color: BLACK.lerp(WHITE, 0.5),
			pos: this.pos,
			anchor: "top",
		});

		const selectColor = BLUE.lighten(30);
		const stamps = EditorStamp.mix(ChartState.notes, ChartState.events);
		stamps.forEach((stamp) => {
			let xPos = this.pos.x;
			if (stamp.is("note")) xPos -= this.sizeOfNote.x;
			const yPos = map(stamp.step, 0, ChartState.conductor.totalSteps, 0, height() - this.sizeOfNote.y);

			let theColor = stamp.is("note") ? ChartNote.moveToColor(stamp.data.move) : BLACK.lerp(WHITE, 0.25);
			if (stamp.selected) theColor = theColor.lerp(selectColor, 0.25);

			const drawOpts = {
				width: this.sizeOfNote.x,
				height: this.sizeOfNote.y,
				color: theColor,
				anchor: "topleft",
				pos: vec2(xPos, yPos),
				opacity: 0.5,
			} as DrawRectOpt;

			if (stamp.selected) {
				drawOpts.outline = {
					color: selectColor,
					width: 2,
				};
			}

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
			width: StateChart.SQUARE_SIZE.x,
			height: this.sizeOfNote.y,
			opacity: 0.5,
			color: RED,
			anchor: "top",
			scale: ChartState.strumlineScale,
			pos: vec2(this.pos.x, this.controller.y + (this.sizeOfNote.y * ChartState.strumlineStep)),
		});

		// draws the minimap controller
		drawRect({
			width: this.width,
			height: this.controller.height, // 11 is the amount of steps you can see
			anchor: "top",
			pos: vec2(this.pos.x, this.controller.y),
			opacity: this.controller.opacity,
			color: YELLOW,
			outline: {
				width: 5,
				color: utils.blendColors(RED, YELLOW, 0.5),
			},
		});
	}

	constructor() {
		this.obj = add(makeMinimapObj());
		this.obj.onUpdate(() => {
			this.width = StateChart.SQUARE_SIZE.x;
			this.height = StateChart.SQUARE_SIZE.y * 11;

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
