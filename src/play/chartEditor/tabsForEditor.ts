import { GameObj, PosComp } from "kaplay";
import { onBeatHit, onNoteHit } from "../../core/events";
import { GameSave } from "../../core/gamesave";
import { juice } from "../../core/plugins/graphics/juiceComponent";
import { utils } from "../../utils";
import { Move } from "../objects/dancer";
import { ChartEvent } from "../song";
import { isStampNote, StateChart } from "./EditorState";
import { EditorTab } from "./editorTabs";

/** Function that defines the tabs found in the {@link EditorTab} class */
export function defineTabs(ChartState: StateChart) {
	EditorTab.tabs.Notes.addElements((editorTabObj) => {
		editorTabObj.width = 240;
		editorTabObj.height = 65;

		const moves: Move[] = ["left", "down", "up", "right"];
		moves.forEach((move, index) => {
			const noteObj = editorTabObj.add([
				sprite(GameSave.noteskin + "_" + move),
				pos(),
				area(),
				opacity(),
				scale(),
				anchor("center"),
				"hover",
			]);

			noteObj.width = 60;
			noteObj.height = 60;
			noteObj.pos.x = (-editorTabObj.width / 2 + index * 60) + noteObj.width / 2;
			noteObj.pos.y = (-editorTabObj.height / 2) + noteObj.height / 2;

			noteObj.onClick(() => {
				ChartState.currentMove = move;
				noteObj.scale = vec2(1.6);
			});

			noteObj.onUpdate(() => {
				noteObj.scale = lerp(noteObj.scale, ChartState.currentMove == move ? vec2(1.2) : vec2(1), 0.6);
				noteObj.opacity = lerp(noteObj.opacity, noteObj.isHovering() ? 0.8 : 0.5, 0.5);
			});
		});
	});

	EditorTab.tabs.Events.addElements((editorTabObj) => {
		const allEvents = Object.keys(ChartState.events) as (keyof typeof ChartState.events)[];
		editorTabObj.width = 240;
		editorTabObj.height = 65 + 65 * allEvents.length % 4;

		allEvents.forEach((eventKey, index) => {
			const eventObj = editorTabObj.add([
				sprite(eventKey),
				pos(),
				area(),
				opacity(),
				scale(),
				anchor("center"),
				"hover",
			]);

			eventObj.width = 60;
			eventObj.height = 60;
			eventObj.pos.x = (-editorTabObj.width / 2 + index * 60) + eventObj.width / 2;
			eventObj.pos.y = (-editorTabObj.height / 2) + eventObj.height / 2;

			eventObj.onClick(() => {
				ChartState.currentEvent = eventKey;
			});
		});
	});

	EditorTab.tabs.Sync.addElements((editorTabObj) => {
		editorTabObj.width = 240;
		editorTabObj.height = 300;

		function makeDummyDancer() {
			let waitEvent = wait(0);
			const DANCER_SCALE = vec2(0.5);

			function fakeDancerComp() {
				return {
					moveBop() {
						return this.stretch({
							XorY: "y",
							startScale: DANCER_SCALE.y * 0.9,
							endScale: DANCER_SCALE.y,
							theTime: 0.25,
						});
					},

					doMove(move: Move) {
						this.moveBop();
						this.play(move);

						if (waitEvent) {
							waitEvent.cancel();
							waitEvent = null;
						}
						waitEvent = wait(1, () => {
							// can't do doMove because then it'll turn into a loop
							this.play("idle");
						});
					},

					get currentMove() {
						return this.getCurAnim().name;
					},
				};
			}

			const dancer = make([
				sprite("dancer_" + GameSave.dancer),
				anchor("bot"),
				pos(),
				area(),
				scale(DANCER_SCALE),
				juice(),
				opacity(),
				fakeDancerComp(),
				"dummyDancer",
				{
					forcedAnim: false,
				},
			]);

			dancer.onClick(() => {
				dancer.moveBop();
			});

			dancer.doMove("idle");

			return dancer;
		}

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

		const dummyDancer = editorTabObj.add(makeDummyDancer());
		dummyDancer.pos = vec2(0, editorTabObj.height - dummyDancer.height / 2 - 30);

		dummyDancer.onUpdate(() => {
			dummyDancer.sprite = "dancer_" + ChartState.getDancerAtTime();
		});

		const playAnimEV = ChartState.onEvent("play-anim", (ev) => {
			if (!dummyDancer) return;
			if (dummyDancer.getAnim(ev.value.anim) == null) {
				console.warn("Animation not found for dancer: " + ev.value.anim);
				return;
			}

			dummyDancer.forcedAnim = ev.value.force;

			// @ts-ignore
			const animSpeed = dummyDancer.getAnim(ev.value.anim)?.speed;
			dummyDancer.play(ev.value.anim, {
				speed: animSpeed * ev.value.speed,
				loop: true,
				pingpong: ev.value.ping_pong,
			});
			dummyDancer.onAnimEnd((animEnded) => {
				if (animEnded != ev.value.anim) return;
				dummyDancer.forcedAnim = false;
				dummyDancer.doMove("idle");
			});
		});

		for (let i = 0; i < ChartState.conductor.stepsPerBeat; i++) {
			addCounterObj(i);
		}

		const onBeatHitEv = onBeatHit(() => {
			const currentBeatObj = (editorTabObj.get("beatcounter") as ReturnType<typeof addCounterObj>[]).find((obj) =>
				obj.beat == (ChartState.conductor.currentBeat % ChartState.conductor.stepsPerBeat) + 1
			);

			tween(vec2(1.3), vec2(1), 0.15, (p) => currentBeatObj.scale = p);
			if (currentBeatObj.beat == ChartState.conductor.stepsPerBeat) {
				tween(YELLOW, WHITE, 0.15, (p) => currentBeatObj.color = p);
			}

			if (dummyDancer.currentMove == "idle") dummyDancer.moveBop();
		});

		const onNoteHitEv = onNoteHit((note) => {
			dummyDancer.doMove(note.move);
		});

		editorTabObj.onDraw(() => {
			drawText({
				text: "Current step: " + ChartState.scrollStep,
				pos: vec2(-editorTabObj.width / 2 + 5, -editorTabObj.height / 2 + 5),
				size: 20,
				align: "left",
			});

			drawText({
				text: "Current beat: " + ChartState.conductor.currentBeat,
				pos: vec2(-editorTabObj.width / 2 + 5, -editorTabObj.height / 2 + 25),
				size: 20,
				align: "left",
			});

			// #region playbar
			const barWidth = map(
				ChartState.scrollTime,
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
				pos: vec2(-editorTabObj.width / 2, editorTabObj.height / 2 - 5),
				color: ChartState.bgColor.lighten(50),
			});

			drawText({
				text: utils.formatTime(ChartState.scrollTime, true),
				align: "left",
				size: 20,
				pos: vec2(-editorTabObj.width / 2 + 5, editorTabObj.height / 2 - 30),
			});

			drawCircle({
				radius: 6,
				pos: vec2(-editorTabObj.width / 2 + lerpedWidth, editorTabObj.height / 2 - 5),
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

	EditorTab.tabs.EditEvent.addElements((editorTabObj) => {
		let currentEvent: ChartEvent = null;

		function positionObject(obj: GameObj<PosComp | any>, index: number) {
			const initialPos = vec2(-editorTabObj.width / 2, -editorTabObj.height / 2);
			obj.pos = vec2(initialPos.x + 15, initialPos.y + 15 + index * 40);
		}

		function objAfterwork(obj: GameObj<PosComp | any>, event: ChartEvent, evKey: string, index: number) {
			obj.use("eventobj");
			obj.value = event.value[evKey];
			obj.onUpdate(() => {
				positionObject(obj, index);
				event.value[evKey] = obj.value;
			});

			obj.onDraw(() => {
				drawText({
					text: utils.unIdText(evKey),
					size: 20,
					pos: vec2(obj.width + 10, 10),
				});
			});
		}

		function refreshEventObjs(event: ChartEvent) {
			editorTabObj.get("eventobj").forEach((obj) => obj.destroy());
			if (!event) return;

			/** All the properties an an event's value has */
			const eventProps = Object.keys(event.value);
			eventProps.forEach((valueKey: string, index: number) => {
				const value = event.value[valueKey];
				const typeOfValue = typeof value;
				const defaultValue = ChartState.events[event.id][valueKey];

				if (typeOfValue == "string") {
					const textbox = EditorTab.ui.addTextbox(editorTabObj, defaultValue);
					objAfterwork(textbox, event, valueKey, index);
				}
				else if (typeOfValue == "boolean") {
					const checkbox = EditorTab.ui.addCheckbox(editorTabObj, defaultValue);
					objAfterwork(checkbox, event, valueKey, index);
				}
				else if (typeOfValue == "number") {
					let increment = 0;
					if (valueKey == "speed" || valueKey == "zoom") increment = 0.1;
					else if (valueKey == "x" || valueKey == "y" || valueKey == "angle") increment = 10;
					else increment = 1;

					const scrollable = EditorTab.ui.addScrollable(editorTabObj, defaultValue, null, increment);
					objAfterwork(scrollable, event, valueKey, index);
				}
				else if (typeOfValue == "object") {
					if (Array.isArray(value)) {
						const easingKeys = Object.keys(easings);
						const scrollable = EditorTab.ui.addScrollable(editorTabObj, defaultValue, easingKeys);
						objAfterwork(scrollable, event, valueKey, index);
					}
				}
			});
		}

		editorTabObj.onUpdate(() => {
			const oldEvent = currentEvent;
			currentEvent = ChartState.selectedStamps.find((stamp) => !isStampNote(stamp)) as ChartEvent;
			const newEvent = currentEvent;

			if (oldEvent != newEvent) {
				refreshEventObjs(currentEvent);
			}

			editorTabObj.width = 300;
			let theHeight = 0;
			if (currentEvent) {
				theHeight = (Object.keys(currentEvent.value).length + 1) * 40;
			}
			else {
				theHeight = 60;
			}

			editorTabObj.height = lerp(editorTabObj.height, theHeight, 0.8);
		});

		editorTabObj.onDraw(() => {
			if (!currentEvent) {
				drawText({
					text: "No valid event",
					size: 25,
					anchor: "center",
					align: "center",
				});
			}
			else {
				drawSprite({
					sprite: currentEvent.id,
					pos: vec2(
						-editorTabObj.width / 2 + formatText({
							text: "Edit event: ",
							align: "left",
							size: 20,
						}).width,
						-editorTabObj.height / 2 - 30,
					),
					height: 25,
					width: 25,
				});
			}
		});

		const pointer = onDraw(() => {
			if (currentEvent) {
				const eventStep = ChartState.conductor.timeToStep(currentEvent.time);
				const stepPos = ChartState.stepToPos(eventStep);
				stepPos.y -= ChartState.SQUARE_SIZE.y * ChartState.lerpScrollStep;

				drawLine({
					p1: vec2(stepPos.x + ChartState.SQUARE_SIZE.x, stepPos.y),
					p2: vec2(editorTabObj.pos.x - editorTabObj.width / 2, editorTabObj.pos.y - editorTabObj.height / 2),
					width: 2,
					opacity: 0.5,
				});
			}
		});

		editorTabObj.onDestroy(() => {
			pointer.cancel();
		});
	});
}
