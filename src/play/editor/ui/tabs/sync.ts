import { GameSave } from "../../../../core/save";
import { utils } from "../../../../utils";
import { ChartEvent } from "../../../event";
import { makeDancer } from "../../../objects/dancer";
import { StateChart } from "../../EditorState";
import { EditorTab } from "../editorTab";

export function defineSyncTab() {
	const ChartState = StateChart.instance;
	EditorTab.tabs.Sync.addElements((editorTabObj) => {
		editorTabObj.width = 240;
		editorTabObj.height = 300;

		function addCounterObj(index: number) {
			const counter = editorTabObj.add([
				text((index + 1).toString(), { align: "left", size: 25 }),
				pos(),
				anchor("center"),
				scale(),
				color(),
				"beatcounter",
				{
					beat: index + 1,
				},
			]);

			counter.pos.x = -30 + index * 20;
			counter.pos.y = 100;

			return counter;
		}

		const dummyDancer = editorTabObj.add(makeDancer(GameSave.dancer, vec2(0.25)));
		dummyDancer.pos = vec2(0, editorTabObj.height - dummyDancer.height / 2 - 30);

		editorTabObj.add([
			rect(1024 * 0.25, 576 * 0.25, { fill: false }),
			color(),
			anchor("center"),
			outline(5, editorTabObj.color.lighten(50)),
		]);

		const previewCameraSquare = editorTabObj.add([
			rect(1024 * 0.25, 576 * 0.25, { fill: false }),
			outline(5, YELLOW.lighten(50)),
			anchor("center"),
			scale(),
			pos(),
			rotate(),
		]);

		const eventsData = ChartState.events.map((ev) => ev.data);

		previewCameraSquare.onUpdate(() => {
			const camValue = ChartEvent.handle["cam-move"](ChartState.conductor.timeInSeconds, eventsData);
			previewCameraSquare.pos = vec2(camValue.x, camValue.y);
			previewCameraSquare.scale = vec2(1 / camValue.zoom);
			previewCameraSquare.angle = camValue.angle;
			dummyDancer.angle = camValue.angle;
		});

		dummyDancer.onUpdate(() => {
			// const dancerAtTime = ChartEvent.handle["change-dancer"](ChartState.conductor.timeInSeconds, ChartState.song.chart.events).dancer;
			// dummyDancer.sprite = getDancerByName(dancerAtTime).spriteName;
		});

		const playAnimEV = ChartEvent.onEvent("play-anim", (ev: ChartEvent<"play-anim">) => {
			// if (!dummyDancer) return;
			// if (dummyDancer.getAnim(ev.value.anim) == null) {
			// 	console.warn("Animation not found for dancer: " + ev.value.anim);
			// 	return;
			// }

			// dummyDancer.forcedAnim = ev.value.force;

			// // @ts-ignore
			// const animSpeed = dummyDancer.getAnim(ev.value.anim)?.speed;
			// dummyDancer.play(ev.value.anim, {
			// 	speed: animSpeed * ev.value.speed,
			// 	loop: true,
			// 	pingpong: ev.value.ping_pong,
			// });
			// dummyDancer.onAnimEnd((animEnded) => {
			// 	if (animEnded != ev.value.anim) return;
			// 	dummyDancer.forcedAnim = false;
			// 	dummyDancer.doMove("idle");
			// });
		});

		for (let i = 0; i < ChartState.conductor.stepsPerBeat; i++) {
			addCounterObj(i);
		}

		const onBeatHitEv = ChartState.conductor.onBeatHit((curBeat) => {
			const currentBeatObj = (editorTabObj.get("beatcounter") as ReturnType<typeof addCounterObj>[]).find((obj) =>
				obj.beat == (curBeat % ChartState.conductor.stepsPerBeat) + 1
			);

			tween(vec2(1.3), vec2(1), 0.15, (p) => currentBeatObj.scale = p);
			if (currentBeatObj.beat == ChartState.conductor.stepsPerBeat) {
				tween(YELLOW, WHITE, 0.15, (p) => currentBeatObj.color = p);
			}

			if (dummyDancer.currentMove == "idle") dummyDancer.moveBop();
		});

		const onNoteHitEv = ChartState.onStampHit((stamp) => {
			if (stamp.is("note")) {
				dummyDancer.doMove(stamp.data.move);
			}
		});

		editorTabObj.onDraw(() => {
			drawText({
				text: "Current step: " + ChartState.conductor.currentStep,
				pos: vec2(editorTabObj.getTopLeft().x + 5, editorTabObj.getTopLeft().y + 5),
				size: 20,
				align: "left",
			});

			drawText({
				text: "Current beat: " + ChartState.conductor.currentBeat,
				pos: vec2(editorTabObj.getTopLeft().x + 5, editorTabObj.getTopLeft().y + 25),
				size: 20,
				align: "left",
			});

			// #region playbar
			const barWidth = map(
				ChartState.conductor.timeInSeconds,
				0,
				ChartState.conductor.audioPlay.duration(),
				0,
				editorTabObj.width,
			);
			let lerpedWidth = 0;
			lerpedWidth = lerp(barWidth, barWidth, 0.5);

			drawRect({
				width: editorTabObj.width,
				height: 10,
				radius: [0, 0, 50, 50],
				anchor: "center",
				pos: vec2(0, editorTabObj.height / 2 - 5),
				color: ChartState.bgColor.darken(50),
			});

			drawRect({
				width: lerpedWidth,
				height: 10,
				radius: [0, 0, 50, 50],
				anchor: "left",
				pos: vec2(editorTabObj.getTopLeft().x, editorTabObj.height / 2 - 5),
				color: ChartState.bgColor.lighten(50),
			});

			drawText({
				text: utils.formatTime(ChartState.conductor.timeInSeconds, true),
				align: "left",
				size: 20,
				pos: vec2(editorTabObj.getTopLeft().x + 5, editorTabObj.height / 2 - 30),
			});

			drawCircle({
				radius: 6,
				pos: vec2(editorTabObj.getTopLeft().x + lerpedWidth, editorTabObj.height / 2 - 5),
				color: ChartState.bgColor.lighten(40),
				anchor: "center",
				outline: {
					color: ChartState.bgColor.lighten(70),
					width: 2,
				},
			});
			// #endregion playbar
		});

		editorTabObj.onDestroy(() => {
			playAnimEV.cancel();
			onBeatHitEv.cancel();
			onNoteHitEv.cancel();
		});
	});
}
