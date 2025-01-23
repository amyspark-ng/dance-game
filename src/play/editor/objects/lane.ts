import { AnchorComp, AreaComp, GameObj, OpacityComp, PosComp, RectComp, Vec2 } from "kaplay";
import { utils } from "../../../utils";
import { StateChart } from "../EditorState";

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
	pos: Vec2 = vec2(width() / 2, 0);
	type: "note" | "event";
	obj: GameObj<PosComp | RectComp | AreaComp | OpacityComp | AnchorComp>;

	lightColor = WHITE.darken(100).darken(10);
	darkColor = WHITE.darken(100).darken(50);
	draw() {
		const ChartState = StateChart.instance;

		for (let i = 0; i < ChartState.conductor.totalSteps; i++) {
			const newPos = vec2(this.pos.x, this.pos.y + StateChart.instance.stepToPos(i).y);
			newPos.y -= StateChart.SQUARE_SIZE.y * StateChart.instance.lerpScrollStep;

			const col = i % 2 == 0 ? this.lightColor : this.darkColor;

			// draws the background chess board squares etc
			if (StateChart.utils.renderingConditions(newPos.y)) {
				// note square
				drawRect({
					width: StateChart.SQUARE_SIZE.x,
					height: StateChart.SQUARE_SIZE.y,
					color: col,
					pos: vec2(newPos.x, newPos.y),
					anchor: "center",
				});
			}

			// draws a line on every beat
			if (i % ChartState.conductor.stepsPerBeat == 0) {
				if (StateChart.utils.renderingConditions(newPos.y)) {
					// line beat
					drawRect({
						width: StateChart.SQUARE_SIZE.x,
						height: 5,
						color: this.darkColor.darken(70),
						anchor: "left",
						pos: vec2(
							newPos.x - StateChart.SQUARE_SIZE.x / 2,
							newPos.y - StateChart.SQUARE_SIZE.y / 2 - 2.5,
						),
					});
				}
			}
		}
	}

	constructor() {
		this.obj = add(makeLaneObj());
		this.obj.onUpdate(() => {
			// TODO: Instead of hardcoding to 11 try to find how many squares in the scree based on the size
			this.obj.width = StateChart.SQUARE_SIZE.x;
			this.obj.height = StateChart.SQUARE_SIZE.y * 11;
			this.obj.pos = this.pos;
		});

		const drawEV = onDraw(() => {
			this.draw();
		});

		this.obj.onDestroy(() => {
			drawEV.cancel();
		});
	}
}

export class NoteLane extends EditorLane {
	constructor() {
		super();
	}
}

export class EventLane extends EditorLane {
	constructor() {
		super();
	}
}
