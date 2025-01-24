// The actual scene for the chart editor
import { timeStamp } from "console";
import { KEventController } from "kaplay";
import { Conductor } from "../../Conductor.ts";
import { gameCursor } from "../../core/cursor.ts";
import { GameSave } from "../../core/save.ts";
import { KaplayState } from "../../core/scenes/KaplayState.ts";
import { BlackBarsTransition } from "../../core/scenes/transitions/blackbar.ts";
import { Sound } from "../../core/sound.ts";
import { utils } from "../../utils.ts";
import { ChartNote } from "../objects/note.ts";
import { StateGame } from "../PlayState.ts";
import { editorShortcuts } from "./backend/handlers.ts";
import { StateChart } from "./EditorState.ts";
import { EventLane, NoteLane } from "./objects/lane.ts";
import { EditorMinimap } from "./objects/minimap.ts";
import { EditorSelectionBox } from "./objects/selectionbox.ts";
import { EditorStamp } from "./objects/stamp.ts";
import { EditorTab } from "./ui/editorTab.ts";
import { MenuBar } from "./ui/menubar.ts";

KaplayState.scene("editor", (ChartState: StateChart) => {
	// Find a way to comfortably put this back in the constructor
	// apparently has to be here because they rely on the conductor and it is only set after the constructor
	Sound.musics.forEach((music) => music.stop());
	ChartState.conductor = new Conductor({
		audioPlay: Sound.playMusic(`${ChartState.song.manifest.uuid_DONT_CHANGE}-audio`, {
			speed: ChartState.params.playbackSpeed,
		}),
		BPM: ChartState.song.manifest.initial_bpm * ChartState.params.playbackSpeed,
		timeSignature: ChartState.song.manifest.time_signature,
		offset: 0,
	});
	ChartState.conductor.audioPlay?.stop();
	ChartState.conductor.audioPlay.seek(ChartState.params.seekTime);
	ChartState.paused = true;
	ChartState.scrollToStep(ChartState.conductor.timeToStep(ChartState.params.seekTime));

	ChartState.song.chart.notes.forEach((chartNote) => {
		ChartState.place("note", chartNote);
	});

	ChartState.song.chart.events.forEach((chartEvent) => {
		ChartState.place("event", chartEvent);
	});

	// have to do it here so it draws before everything else
	onDraw(() => {
		drawRect({
			width: width(),
			height: height(),
			color: ChartState.bgColor,
		});
	});

	// EditorUtils.handlers.mouseAnim();
	ChartState.noteLane = new NoteLane();
	ChartState.eventLane = new EventLane();
	ChartState.eventLane.pos = ChartState.noteLane.pos.add(StateChart.SQUARE_SIZE.x, 0);
	// the ol' switcheroo
	ChartState.eventLane.darkColor = ChartState.noteLane.lightColor;
	ChartState.eventLane.lightColor = ChartState.noteLane.darkColor;

	// #region NOTES
	/** The event for stretching a note */
	let stretchingNoteEV: KEventController = null;
	ChartState.noteLane.obj.onClick(() => {
		let hoveredNote = ChartState.notes.find((note) => note.isHovering());
		// place a new note
		if (!hoveredNote) {
			ChartState.takeSnapshot(`add ${move} note`);
			hoveredNote = ChartState.place("note", { time: ChartState.conductor.stepToTime(ChartState.hoveredStep), move: ChartState.currentMove });
			hoveredNote.selected = true;
			hoveredNote.bop();
			hoveredNote.addSound();

			stretchingNoteEV?.cancel();
			stretchingNoteEV = onMouseMove(() => {
				let oldLength = hoveredNote.data.length;
				const noteLength = Math.floor(ChartState.hoveredStep - hoveredNote.step);
				hoveredNote.data.length = noteLength > 0 ? noteLength : undefined;
				let newLength = hoveredNote.data.length;
				if (oldLength != newLength) {
					hoveredNote.stretchSound();
				}
			});

			const releaseEV = onMouseRelease(() => {
				if (hoveredNote.data.length) hoveredNote.snapSound();
				releaseEV.cancel();
				stretchingNoteEV?.cancel();
				stretchingNoteEV = null;
			});
		}
		// existing note
		else {
			hoveredNote.selected = true;
		}
	});

	ChartState.noteLane.obj.onMousePress("right", () => {
		if (!ChartState.noteLane.obj.isHovering()) return;
		const theNote = ChartState.delete("note");
		if (theNote) {
			theNote.deleteSound();
		}
	});

	ChartState.noteLane.obj.onMousePress("middle", () => {
		if (!ChartState.noteLane.obj.isHovering()) return;
		const hovered = ChartState.notes.find((note) => note.isHovering());
		if (hovered) ChartState.currentMove = hovered.data.move;
	});
	// #endregion NOTES

	// #region EVENTS
	ChartState.eventLane.obj.onClick(() => {
		let hoveredEvent = ChartState.events.find((ev) => ev.isHovering());
		if (!hoveredEvent) {
			hoveredEvent = ChartState.place("event", { time: ChartState.conductor.stepToTime(ChartState.hoveredStep), id: ChartState.currentEvent, value: {} });
			hoveredEvent.selected = true;
			hoveredEvent.bop();
			hoveredEvent.addSound();
		}
		// there's already an event
		else {
			// if already selected now edit it
			if (hoveredEvent.selected) {
				ChartState.events.filter((ev) => ev != hoveredEvent).forEach((event) => {
					if (event.beingEdited == true) event.beingEdited = false;
				});

				if (hoveredEvent.beingEdited == false) {
					hoveredEvent.beingEdited = true;
					hoveredEvent.editSound();
				}
				else {
					hoveredEvent.twist();
				}
			}
			else {
				hoveredEvent.selected = true;
			}
		}
	});

	ChartState.eventLane.obj.onMousePress("right", () => {
		if (!ChartState.eventLane.obj.isHovering()) return;
		const theEvent = ChartState.delete("event");
		if (theEvent) {
			theEvent.deleteSound();
		}
	});

	ChartState.eventLane.obj.onMousePress("middle", () => {
		if (!ChartState.eventLane.obj.isHovering()) return;
		const hoveredEvent = ChartState.events.find((event) => event.isHovering());
		if (hoveredEvent) {
			ChartState.currentEvent = hoveredEvent.data.id;
		}
	});
	// #ENDREGION EVENTS

	let differencesToLeading = { notes: [] as number[], events: [] as number[] };
	onMousePress("left", () => {
		// if you're not holding control then let go of all selected notes
		if (!isKeyDown("control")) {
			if (!EditorStamp.mix(ChartState.notes, ChartState.events).some((note) => note.isHovering())) {
				ChartState.selected.forEach((stamp) => stamp.selected = false);
			}
		}

		const hoveredNote = EditorStamp.mix(ChartState.notes, ChartState.events).find((stamp) => stamp.isHovering());

		// found a hovered note, turn it into a leader and make it work
		if (hoveredNote) {
			hoveredNote.selected = true;
			ChartState.leaderStamp = hoveredNote;
			ChartState.lastLeaderStep = hoveredNote.step;
		}
		else {
			ChartState.leaderStamp = undefined;
			ChartState.lastLeaderStep = 0;
		}

		if (!ChartState.leaderStamp) return;
		differencesToLeading.notes = ChartState.notes.map((note) => {
			return note.step - ChartState.leaderStamp.step;
		});

		differencesToLeading.events = ChartState.events.map((event) => {
			return event.step = ChartState.leaderStamp.step;
		});
	});

	onMouseDown("left", () => {
		if (!(ChartState.noteLane.obj.isHovering() || ChartState.eventLane.obj.isHovering())) return;
		if (!ChartState.leaderStamp) return;

		let oldTime = ChartState.leaderStamp.data.time;

		// is the actual thing that changes the step of the note
		ChartState.selected.forEach((stamp) => {
			// is the leading stamp
			if (stamp == ChartState.leaderStamp) {
				ChartState.leaderStamp.step = ChartState.hoveredStep;
			}
			// is another stamp
			else {
				// this stamp must always be "stepDiff" steps away from leaderStampStep
				if (stamp.is("note")) {
					const stepDiff = differencesToLeading.notes[ChartState.notes.indexOf(stamp)];
					stamp.step = ChartState.leaderStamp.step + stepDiff;
				}
				else if (stamp.is("event")) {
					const stepDiff = differencesToLeading.events[ChartState.events.indexOf(stamp)];
					stamp.step = ChartState.leaderStamp.step + stepDiff;
				}
			}
		});

		let newTime = ChartState.leaderStamp.data.time;

		if (newTime != oldTime) {
			// thinking WAY too hard for a simple sound effect lol!
			const diff = ChartState.conductor.timeToStep(newTime) - ChartState.lastLeaderStep;
			const theSound = ChartState.leaderStamp.moveSound();
			theSound.detune *= diff;
		}
	});

	onMouseRelease("left", () => {
		ChartState.leaderStamp = undefined;
	});

	ChartState.minimap = new EditorMinimap();
	ChartState.minimap.pos = ChartState.eventLane.pos.add(StateChart.SQUARE_SIZE.x, 0);

	ChartState.selectionBox = new EditorSelectionBox();

	onUpdate(() => {
		if (ChartState.leaderStamp) {
			// debug.log(ChartState.leaderNote.step);
		}
		ChartState.bgColor = rgb(92, 50, 172);
		ChartState.conductor.paused = ChartState.paused;

		// editor stamps update
		ChartState.notes.forEach((note) => note.update());
		ChartState.events.forEach((event) => event.update());

		// MOUSE COLOR
		const currentColor = ChartNote.moveToColor(ChartState.currentMove);
		const mouseColor = utils.blendColors(WHITE, currentColor, 0.5);
		gameCursor.color = lerp(gameCursor.color, mouseColor, StateChart.LERP);

		// SCROLL STEP
		ChartState.lerpScrollStep = lerp(ChartState.lerpScrollStep, ChartState.scrollStep, StateChart.LERP);
		if (ChartState.paused) {
			const theTime = ChartState.conductor.stepToTime(ChartState.scrollStep + ChartState.strumlineStep);
			ChartState.conductor.timeInSeconds = theTime;
		}
		else {
			const stepOffsetTime = ChartState.conductor.stepToTime(ChartState.strumlineStep);
			const newStep = ChartState.conductor.timeToStep(
				ChartState.conductor.timeInSeconds - stepOffsetTime,
			);
			ChartState.scrollStep = Math.round(newStep);
		}

		// HOVERED STEP
		ChartState.hoveredStep = ChartState.scrollStep + Math.floor(gameCursor.pos.y / StateChart.SQUARE_SIZE.y);

		ChartState.minimap.update();
		ChartState.selectionBox.update();
		editorShortcuts();
	});

	onDraw(() => {
		ChartState.notes.forEach((note) => note.draw());
		ChartState.events.forEach((event) => event.draw());
		ChartState.minimap.draw();
		ChartState.selectionBox.draw();

		// TODO: REWORK NOTE CURSOR

		// # strumlineline
		const strumlineYPos = StateChart.instance.strumlineStep * StateChart.SQUARE_SIZE.y;
		drawRect({
			pos: vec2(center().x, strumlineYPos),
			anchor: "center",
			height: 5,
			radius: 5,
			color: RED,
			scale: vec2(StateChart.instance.strumlineScale.x, 1),
			width: (StateChart.SQUARE_SIZE.x * 3),
		});
	});

	// The scroll event
	onScroll((delta) => {
		let scrollPlus = 0;
		if (!ChartState.paused) ChartState.paused = true;

		if (delta.y >= 1) scrollPlus = 1;
		else scrollPlus = -1;

		// strumline step
		if (isKeyDown("shift")) {
			if (ChartState.strumlineStep >= 0 && ChartState.strumlineStep < ChartState.conductor.totalSteps) {
				ChartState.strumlineStep += scrollPlus;
				ChartState.strumlineStep = clamp(
					ChartState.strumlineStep,
					0,
					ChartState.conductor.totalSteps - ChartState.scrollStep,
				);
			}
		}
		else {
			// scroll step
			ChartState.scrollToStep(ChartState.scrollStep + scrollPlus);
		}
	});

	// Send you to the game
	onKeyPress("enter", async () => {
		if (!ChartState.inputEnabled) return;
		if (get("textbox", { recursive: true }).some((textbox) => textbox.focused)) return;

		ChartState.inputEnabled = false;
		ChartState.paused = true;

		// transition to scene normally
		KaplayState.switchState(
			new StateGame({
				dancerName: GameSave.dancer,
				fromEditor: true,
				song: ChartState.song,
				playbackSpeed: ChartState.params.playbackSpeed,
				seekTime: ChartState.params.seekTime,
			}),
			BlackBarsTransition,
		);
	});

	// Pausing unpausing behaviour
	onKeyPress("space", () => {
		if (!ChartState.inputEnabled) return;
		ChartState.paused = !ChartState.paused;

		if (ChartState.paused == false) {
			ChartState.conductor.audioPlay.seek(ChartState.conductor.timeInSeconds);
		}
	});

	onKeyPress("escape", () => {
		// openExitDialog();
	});

	// makes the strumline BOP
	ChartState.conductor.onBeatHit((curBeat) => {
		tween(vec2(1.2), vec2(1), 0.1, (p) => ChartState.strumlineScale = p);
	});

	// Scrolls the checkerboard
	ChartState.conductor.onStepHit((currentStep) => {
		const allStamps = EditorStamp.mix(ChartState.notes, ChartState.events);
		allStamps.forEach((stamp) => {
			if (stamp.step == currentStep) {
				getTreeRoot().trigger("stampHit", stamp);
			}
		});
	});

	onSceneLeave(() => {
		gameCursor.color = WHITE;
	});

	MenuBar.setup();
	EditorTab.setup();
});
