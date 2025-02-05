import { getDancer } from "../../../../data/dancer";
import { ChartEvent } from "../../../../data/event/event";
import EventHandler from "../../../../data/event/handler";
import { utils } from "../../../../utils";
import { DANCER_POS, makeDancer } from "../../../objects/dancer";
import { StateChart } from "../../EditorState";
import { EditorTab } from "../tabs";
import addTab from "./baseTab";

export function syncTab() {
	const ChartState = StateChart.instance;
	const tab = addTab(EditorTab.tabs.Sync);

	const stepText = tab.add([
		text("Current step: " + ChartState.conductor.currentStep, { size: 20 }),
		pos(),
		"ui",
		"step",
	]);

	const beatText = tab.add([
		text("Current beat: " + ChartState.conductor.currentBeat, { size: 20 }),
		pos(),
		"ui",
		"beat",
	]);

	const previewParent = tab.add(["ui", pos(), { height: 576 * 0.25, width: 1024 * 0.25 }]);
	// const previewParent = tab.add(["ui", pos(), opacity(0.5), rect(1024 * 0.25, 576 * 0.25)]);
	const previewSquare = previewParent.add([
		rect(previewParent.width, previewParent.height, { fill: false }),
		outline(5, tab.color.lighten(50)),
	]);
	const camSquare = previewSquare.add([
		rect(previewParent.width, previewParent.height, { fill: false }),
		outline(5, YELLOW),
		pos(),
		scale(),
		rotate(),
		anchor("center"),
	]);

	// add dancer
	const dancer = previewSquare.add(makeDancer(getDancer().manifest.name, vec2(0.25)));
	dancer.pos = DANCER_POS.scale(0.25);

	camSquare.onUpdate(() => {
		const events = ChartState.song.chart.events;
		const camValue = EventHandler["cam-move"](ChartState.conductor.time, events);

		camSquare.pos.x = camSquare.width / 2 + camValue.x;
		camSquare.pos.y = camSquare.height / 2 + camValue.y;
		camSquare.angle = camValue.angle;
		camSquare.scale = vec2(1 / camValue.zoom);

		dancer.angle = camSquare.angle;
	});

	const counterParent = tab.add([pos(), "ui", "counter", { width: 0, height: 0 }]);
	function addCounterObj(index: number) {
		const counter = counterParent.add([
			text((index + 1).toString(), { align: "left", size: 25 }),
			pos(),
			scale(),
			color(),
			anchor("center"),
			"beatcounter",
			{
				beat: index + 1,
			},
		]);

		counter.pos.x = index * counter.width * 1.25;
		counter.pos.y += counter.height / 2;

		return counter;
	}

	for (let i = 0; i < ChartState.conductor.stepsPerBeat; i++) {
		const counter = addCounterObj(i);
		counterParent.width += counter.width * 1.25;
		counterParent.height = counter.height * 1.5;
	}

	counterParent.onUpdate(() => {
		counterParent.pos.x = tab.width / 2 - counterParent.width / 2;
	});

	const playAnimEV = ChartEvent.onEvent("play-anim", (ev: ChartEvent<"play-anim">) => {
		dancer.play(ev.data.anim);
	});

	const onStepHitEv = ChartState.conductor.onStepHit((curStep) => {
		const camValue = EventHandler["cam-move"](ChartState.conductor.time, ChartState.song.chart.events);
		if (curStep % (Math.round(ChartState.conductor.stepsPerBeat / camValue.bop_rate)) == 0) {
			// handling zoom
			tween(
				camValue.bop_strength,
				camValue.zoom,
				ChartState.conductor.stepInterval,
				(p) => {
					camSquare.scale = vec2(1 / p).scale(camSquare.scale);
				},
				easings[camValue.easing],
			);
		}
	});

	const onBeatHitEv = ChartState.conductor.onBeatHit((curBeat) => {
		const currentBeatObj = (counterParent.get("beatcounter") as ReturnType<typeof addCounterObj>[]).find((obj) =>
			obj.beat == (curBeat % ChartState.conductor.stepsPerBeat) + 1
		);

		tween(vec2(1.3), vec2(1), 0.15, (p) => currentBeatObj.scale = p);
		if (currentBeatObj.beat == ChartState.conductor.stepsPerBeat) {
			tween(YELLOW, WHITE, 0.15, (p) => currentBeatObj.color = p);
		}

		if (dancer.currentMove == "idle") dancer.moveBop();
	});

	const onNoteHitEv = ChartState.onStampHit((stamp) => {
		if (stamp.is("note")) {
			dancer.doMove(stamp.data.move);
		}
	});

	tab.onDraw(() => {
		// #region playbar
		const barWidth = map(
			ChartState.conductor.time,
			0,
			ChartState.conductor.audioPlay.duration(),
			0,
			tab.width,
		);
		let lerpedWidth = 0;
		lerpedWidth = lerp(barWidth, barWidth, 0.5);

		drawRect({
			width: tab.width,
			height: 10,
			radius: [0, 0, tab.radius[2], tab.radius[3]],
			anchor: "topleft",
			pos: vec2(0, tab.height - 10),
			color: ChartState.bgColor.darken(50),
		});

		drawRect({
			width: lerpedWidth,
			height: 10,
			radius: [0, 0, 50, 50],
			anchor: "left",
			pos: vec2(0, tab.height - 5),
			color: ChartState.bgColor.lighten(50),
		});

		drawText({
			text: utils.formatTime(ChartState.conductor.time, true),
			align: "left",
			size: 20,
			pos: vec2(5, tab.height - 30),
		});

		drawCircle({
			radius: 6,
			pos: vec2(lerpedWidth, tab.height - 5),
			color: ChartState.bgColor.lighten(40),
			anchor: "center",
			outline: {
				color: ChartState.bgColor.lighten(70),
				width: 2,
			},
		});
		// #endregion playbar
	});

	tab.onDestroy(() => {
		playAnimEV.cancel();
		onBeatHitEv.cancel();
		onStepHitEv.cancel();
		onNoteHitEv.cancel();
	});

	tab.updateLayout();

	return tab;
}
