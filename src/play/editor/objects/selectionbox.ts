import { Vec2 } from "kaplay";
import { StateChart } from "../EditorState";
import { EditorStamp } from "./stamp";

export class EditorSelectionBox {
	canSelect: boolean = false;
	width: number = 0;
	height: number = 0;
	pos: Vec2 = vec2();
	lastClickPos: Vec2 = vec2();
	points: [Vec2, Vec2, Vec2, Vec2] = [vec2(), vec2(), vec2(), vec2()];

	update() {
		const ChartState = StateChart.instance;

		if (isMousePressed("left")) {
			const canSelect = !get("hover", { recursive: true }).some((obj) => obj.isHovering())
				&& !ChartState.isCursorInGrid
				&& !get("editorTab").some((obj) => obj.isHovering)
				&& !ChartState.minimap.canMove;

			this.canSelect = canSelect;
			if (this.canSelect) {
				this.lastClickPos = mousePos();
			}
		}

		if (isMouseDown("left") && this.canSelect) {
			this.width = Math.abs(mousePos().x - this.lastClickPos.x);
			this.height = Math.abs(mousePos().y - this.lastClickPos.y);

			this.pos.x = Math.min(this.lastClickPos.x, mousePos().x);
			this.pos.y = Math.min(this.lastClickPos.y, mousePos().y);

			// # topleft
			// the pos will just be the pos of the selectionbox since it's anchor topleft
			this.points[0] = this.pos;

			// # topright
			// the x will be the same as topleft.x + width
			this.points[1].x = this.pos.x + this.width;
			// y will be the same as topleft.y
			this.points[1].y = this.pos.y;

			// # bottomleft
			// the x will be the same as points[0].x
			this.points[2].x = this.pos.x;
			// the y will be pos.y + height
			this.points[2].y = this.pos.y + this.height;

			// # bottomright
			// the x will be the same as topright x pos
			this.points[3].x = this.points[1].x;
			// the y will be the same as bottom left
			this.points[3].y = this.points[2].y;
		}

		if (isMouseReleased("left") && this.canSelect) {
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
				ChartState.takeSnapshot(`selected ${stampsCollided.length} stamps`);
				stampsCollided.forEach((stamp) => {
					stamp.selected = true;
					stamp.twitch();
				});
			}

			this.lastClickPos = vec2(0, 0);
			this.points = [vec2(0, 0), vec2(0, 0), vec2(0, 0), vec2(0, 0)];
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
			color: BLUE,
			opacity: 0.1,
			outline: {
				color: BLUE,
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
