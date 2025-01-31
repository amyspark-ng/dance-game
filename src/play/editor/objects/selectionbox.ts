import { Color, KEventController, Vec2 } from "kaplay";
import { StateChart } from "../EditorState";
import { EditorStamp } from "./stamp";

let scrollEv: KEventController = null;
export class EditorSelectionBox {
	canSelect: boolean = false;
	width: number = 0;
	height: number = 0;
	color: Color = BLUE;

	/** The pos of the selection box (starts at click pos) */
	pos: Vec2 = vec2();

	/** The position the selection box starts at */
	lastClickPos: Vec2 = vec2();

	get isSelecting() {
		return this.lastClickPos && this.width > 1 && this.height > 1;
	}

	update() {
		const ChartState = StateChart.instance;

		if (isMousePressed("left")) {
			const canSelect = !get("hover", { recursive: true }).some((obj) => obj.isHovering())
				&& !get("drag", { recursive: true }).some((obj) => obj.dragging)
				&& !ChartState.isCursorInGrid
				&& !ChartState.minimap.canMove;

			this.canSelect = canSelect;
			if (this.canSelect) {
				this.lastClickPos = mousePos();
				scrollEv?.cancel();
				scrollEv = onScroll((delta) => {
					if (delta.y > 0 && ChartState.scrollStep + 1 <= ChartState.conductor.totalSteps) this.lastClickPos.y -= StateChart.SQUARE_SIZE.y;
					else if (delta.y < 0 && ChartState.scrollStep - 1 >= 0) this.lastClickPos.y += StateChart.SQUARE_SIZE.y;
				});
			}
		}

		if (isMouseDown("left") && this.canSelect) {
			this.width = Math.abs(mousePos().x - this.lastClickPos.x);
			this.height = Math.abs(mousePos().y - this.lastClickPos.y);

			this.pos.x = Math.min(this.lastClickPos.x, mousePos().x);
			this.pos.y = Math.min(this.lastClickPos.y, mousePos().y);
		}

		if (isMouseReleased("left") && this.canSelect) {
			scrollEv?.cancel();

			const boxRect = new Rect(
				this.pos,
				this.width,
				this.height,
			);

			const stampsCollided: EditorStamp[] = [];

			// goes through each stamp and checks if the box has collided with them
			EditorStamp.mix(ChartState.notes, ChartState.events).forEach((stamp) => {
				const stampRect = new Rect(stamp.pos.sub(stamp.width / 2, stamp.height / 2), stamp.width, stamp.height);
				if (stamp.is("note") && stamp.data.length) stampRect.height += stamp.height * stamp.data.length;

				if (boxRect.collides(stampRect)) {
					stampsCollided.push(stamp);
				}
			});

			// if stamp was collided take a snapshot and actually select them
			if (stampsCollided.length > 0) {
				ChartState.takeSnapshot(`selected ${StateChart.utils.boxSortStamps(stampsCollided).toString()}`);
				stampsCollided.forEach((stamp) => {
					stamp.selected = true;
					stamp.twitch();
				});
			}

			this.lastClickPos = vec2(0, 0);
			this.pos = vec2(0, 0);
			this.width = 0;
			this.height = 0;
		}
	}

	draw() {
		if (this.width < 1 || this.height < 1) return;

		drawRect({
			width: this.width,
			height: this.height,
			pos: vec2(this.pos.x, this.pos.y),
			color: this.color,
			opacity: 0.25,
			outline: {
				color: this.color,
				width: 5,
			},
		});
	}

	constructor() {
		const obj = add([]);
		obj.onUpdate(() => {
			this.update();
		});

		obj.onDraw(() => {
			this.draw();
		});
	}
}
