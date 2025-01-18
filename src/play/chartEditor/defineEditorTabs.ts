import { GameObj, PosComp } from "kaplay";
import { GameSave, GameSaveClass } from "../../core/gamesave";
import { FileManager } from "../../fileManaging";
import { utils } from "../../utils";
import { ChartEvent } from "../event";
import { makeDancer, Move } from "../objects/dancer";
import { StateChart } from "./EditorState";
import { EditorTab } from "./editorTabs";
import { EditorUtils } from "./EditorUtils";

/** Function that defines the tabs found in the {@link EditorTab} class */
export function defineTabs() {
	const ChartState = StateChart.instance;

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
		const allEvents = Object.keys(ChartEvent.eventSchema) as (keyof typeof ChartEvent.eventSchema)[];

		const theHeight = (Math.floor(allEvents.length / 4) * 65)
			+ (allEvents.length % 4 != 0 ? 65 : 0);
		editorTabObj.width = 65 * 4;
		editorTabObj.height = theHeight;

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
			const startingPos = vec2(
				-editorTabObj.width / 2 + eventObj.width / 2,
				-editorTabObj.height / 2 + eventObj.height / 2,
			);

			const row = Math.floor(index / 4);
			const column = index % 4;
			const thepos = utils.getPosInGrid(startingPos, row, column, vec2(65));

			eventObj.pos.x = thepos.x;
			eventObj.pos.y = thepos.y;

			eventObj.onClick(() => {
				ChartState.currentEvent = eventKey;
			});
		});
	});

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

		const dummyDancer = editorTabObj.add(makeDancer(GameSave.dancer));
		dummyDancer.intendedScale = vec2(0.5);
		dummyDancer.scale = dummyDancer.intendedScale;
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

		const onBeatHitEv = ChartState.conductor.onBeatHit((curBeat) => {
			const currentBeatObj = (editorTabObj.get("beatcounter") as ReturnType<typeof addCounterObj>[]).find((obj) =>
				obj.beat == (curBeat % ChartState.conductor.stepsPerBeat) + 1
			);

			tween(vec2(1.3), vec2(1), 0.15, (p) => currentBeatObj.scale = p);
			if (currentBeatObj.beat == ChartState.conductor.stepsPerBeat) {
				tween(YELLOW, WHITE, 0.15, (p) => currentBeatObj.color = p);
			}

			if (dummyDancer.getCurAnim().name == "idle") dummyDancer.moveBop();
		});

		const onNoteHitEv = ChartState.events.onNoteHit((note) => {
			dummyDancer.doMove(note.move);
		});

		editorTabObj.onDraw(() => {
			drawText({
				text: "Current step: " + ChartState.conductor.currentStep,
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
				pos: vec2(-editorTabObj.width / 2, editorTabObj.height / 2 - 5),
				color: ChartState.bgColor.lighten(50),
			});

			drawText({
				text: utils.formatTime(ChartState.conductor.timeInSeconds, true),
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
			eventProps.forEach((keyofValue: string, index: number) => {
				const value = event.value[keyofValue];
				const typeOfValue = typeof value;
				const defaultValue = ChartEvent.eventSchema[event.id][keyofValue];

				if (typeOfValue == "string") {
					const textbox = EditorTab.ui.addTextbox(editorTabObj, defaultValue);
					objAfterwork(textbox, event, keyofValue, index);
				}
				else if (typeOfValue == "boolean") {
					const checkbox = EditorTab.ui.addCheckbox(editorTabObj, defaultValue);
					objAfterwork(checkbox, event, keyofValue, index);
				}
				else if (typeOfValue == "number") {
					let increment = 0;
					if (keyofValue == "speed" || keyofValue == "zoom" || keyofValue == "strength") increment = 0.1;
					else if (keyofValue == "x" || keyofValue == "y" || keyofValue == "angle") increment = 10;
					else increment = 1;

					const scrollable = EditorTab.ui.addScrollable(editorTabObj, defaultValue, null, increment);
					objAfterwork(scrollable, event, keyofValue, index);
				}
				else if (typeOfValue == "object") {
					if (Array.isArray(value)) {
						const easingKeys = Object.keys(easings);
						const scrollable = EditorTab.ui.addScrollable(editorTabObj, defaultValue, easingKeys);
						objAfterwork(scrollable, event, keyofValue, index);
					}
				}
			});
		}

		editorTabObj.onUpdate(() => {
			const oldEvent = currentEvent;
			currentEvent = ChartState.selectedStamps.find((stamp) => !EditorUtils.stamps.isNote(stamp)) as ChartEvent;
			const newEvent = currentEvent;

			if (oldEvent != newEvent) {
				refreshEventObjs(currentEvent);
				if (currentEvent) ChartState.input.shortcutEnabled = false;
				else ChartState.input.shortcutEnabled = true;
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

	EditorTab.tabs.SongInfo.addElements((editorTabObj) => {
		type songField = { name: string; type: string; direction: string; };

		const fields: songField[] = [
			{ name: "Song name", type: "string", direction: "name" },
			{ name: "Artist name", type: "string", direction: "artist" },
			{ name: "Charter name", type: "string", direction: "charter" },
			{ name: "BPM", type: "number", direction: "initial_bpm" },
			{ name: "Scroll speed", type: "number", direction: "initial_scrollspeed" },
			{ name: "Steps per beat", type: "number", direction: "time_signature[0]" },
			{ name: "Beats per measure", type: "number", direction: "time_signature[1]" },
			{ name: "Cover path", type: "function", direction: "cover_file" },
			{ name: "Audio path", type: "function", direction: "audio_file" },
		];
		editorTabObj.width = 600;
		editorTabObj.height = 40 * fields.length + 20;

		fields.forEach((field, index) => {
			const title = editorTabObj.add([
				text(field.name + ": ", { size: 30, align: "right" }),
				pos(),
				anchor("topright"),
			]);

			let object = null as any;

			let initialValue = ChartState.song.manifest[field.direction];
			if (!initialValue) {
				// this means it's the time signature one
				const direction = field.direction.split("[")[0];
				const index = parseInt(field.direction.split("[")[1].split("]")[0]);
				initialValue = ChartState.song.manifest[direction][index];
			}

			if (field.type == "string") {
				object = EditorTab.ui.addTextbox(editorTabObj, initialValue);
			}
			else if (field.type == "number") {
				const increase = field.direction.includes("scrollspeed")
					? 0.1
					: 1;
				object = EditorTab.ui.addScrollable(editorTabObj, initialValue, null, increase);
			}
			else if (field.type == "function") {
				object = EditorTab.ui.addButton(editorTabObj, initialValue, async () => {
					const loading = FileManager.loadingScreen();
					let file: File = null;
					if (field.direction == "cover_file") file = await FileManager.receiveFile("cover");
					else if (field.direction == "audio_file") file = await FileManager.receiveFile("audio");

					if (file) {
						// cover
						if (field.direction == "cover_file") {
							const base64 = FileManager.ImageToBase64(file);
							await loadSprite(ChartState.song.manifest.uuid_DONT_CHANGE + "-cover", base64);
						}
						// audio
						else if (field.direction == "audio_file") {
							await loadSound(
								ChartState.song.manifest.uuid_DONT_CHANGE + "-audio",
								await file.arrayBuffer(),
							);
							ChartState.updateAudio();
						}

						object.value = file.name;
					}

					loading.cancel();
				});
			}
			else return;

			title.pos.x = 10;
			title.pos.y = 10 + (-editorTabObj.height / 2) + 40 * index;

			object.pos.y = title.pos.y;
			object.pos.x = 10;

			title.onUpdate(() => {
				if (field.direction.includes("[")) {
					const direction = field.direction.split("[")[0];
					const index = parseInt(field.direction.split("[")[1].split("]")[0]);
					const value = ChartState.song.manifest[direction][index];

					ChartState.song.manifest[direction][index] = object.value;
				}
				else {
					ChartState.song.manifest[field.direction] = object.value;
				}
			});
		});

		editorTabObj.onDraw(() => {
			if (!getSprite(ChartState.song.manifest.uuid_DONT_CHANGE + "-cover")) return;
			drawSprite({
				sprite: ChartState.song.manifest.uuid_DONT_CHANGE + "-cover",
				width: 100,
				height: 100,
				anchor: "center",
				pos: vec2(200, 0),
			});
		});
	});
}
