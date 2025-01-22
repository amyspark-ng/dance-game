// The actual scene for the chart editor
import { KEventController } from "kaplay";
import { Conductor } from "../../Conductor.ts";
import { gameCursor } from "../../core/cursor.ts";
import { GameSave } from "../../core/save.ts";
import { KaplayState } from "../../core/scenes/KaplayState.ts";
import { BlackBarsTransition } from "../../core/scenes/transitions/blackbar.ts";
import { Sound } from "../../core/sound.ts";
import { utils } from "../../utils.ts";
import { ChartEvent } from "../event.ts";
import { ChartNote } from "../objects/note.ts";
import { StateGame } from "../PlayState.ts";
import { MenuBar } from "./editorMenus.ts";
import { EditorRenderer, SCROLL_LERP_VALUE } from "./EditorRenderer.ts";
import { ChartStamp, StateChart } from "./EditorState.ts";
import { EditorTab } from "./editorTabs.ts";
import { EditorCommands, EditorUtils } from "./EditorUtils.ts";

KaplayState.scene("editor", (ChartState: StateChart) => {
	// Find a way to comfortably put this back in the constructor
	ChartState.conductor = new Conductor({
		audioPlay: Sound.playMusic(`${ChartState.song.manifest.uuid_DONT_CHANGE}-audio`, {
			speed: ChartState.params.playbackSpeed,
		}),
		BPM: ChartState.song.manifest.initial_bpm * ChartState.params.playbackSpeed,
		timeSignature: ChartState.song.manifest.time_signature,
		offset: 0,
	});
	ChartState.conductor.audioPlay.seek(ChartState.params.seekTime);
	ChartState.paused = true;
	ChartState.scrollToStep(ChartState.conductor.timeToStep(ChartState.params.seekTime));

	onDraw(() => {
		drawRect({
			width: width(),
			height: height(),
			color: ChartState.bgColor,
		});
	});

	EditorUtils.handlers.mouseAnim();

	onUpdate(() => {
		// ChartState.bgColor = Color.fromHSL(GameSave.editorHue, 0.45, 0.48);
		ChartState.bgColor = rgb(92, 50, 172);

		const allStamps = EditorUtils.stamps.concat(ChartState.song.chart.notes, ChartState.song.chart.events);
		allStamps.forEach((stamp, index) => {
			EditorUtils.stamps.fix(stamp);

			const isNote = EditorUtils.stamps.isNote(stamp);
			if (!ChartState.stampProps[isNote ? "notes" : "events"][index]) {
				ChartState.stampProps[isNote ? "notes" : "events"][index] = {
					scale: vec2(1),
					angle: 0,
				};
			}
		});

		// STAMP PROP
		ChartState.stampProps["notes"] = ChartState.stampProps["notes"].slice(
			0,
			ChartState.song.chart.notes.length,
		);

		ChartState.stampProps["events"] = ChartState.stampProps["events"].slice(
			0,
			ChartState.song.chart.events.length,
		);

		// TODO: Do stuff for properly animating dancer
		ChartState.song.chart.events.forEach((ev) => {
			if (ChartState.conductor.timeInSeconds >= ev.time) {
				if (ChartState.doneEvents.includes(ev)) return;
				ChartState.doneEvents.push(ev);
			}
			else {
				ChartState.doneEvents = utils.removeFromArr(ev, ChartState.doneEvents);
			}
		});

		ChartState.conductor.paused = ChartState.paused;

		// SCROLL STEP
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

		ChartState.lerpScrollStep = lerp(ChartState.lerpScrollStep, ChartState.scrollStep, SCROLL_LERP_VALUE);

		// MOUSE COLOR
		const currentColor = ChartNote.moveToColor(ChartState.currentMove);
		const mouseColor = utils.blendColors(WHITE, currentColor, 0.5);
		gameCursor.color = lerp(gameCursor.color, mouseColor, SCROLL_LERP_VALUE);

		// HOVERED STEP
		ChartState.hoveredStep = ChartState.scrollStep + Math.floor(gameCursor.pos.y / ChartState.SQUARE_SIZE.y);

		// some handlers
		EditorUtils.handlers.grid();
		EditorUtils.handlers.shortcuts();
		EditorUtils.handlers.selectionBox();
		EditorUtils.handlers.minimap();

		leftMousePress.paused = !ChartState.input.trackEnabled;
		rightMousePress.paused = !ChartState.input.trackEnabled;
		rightMouseDown.paused = !ChartState.input.trackEnabled;
	});

	/** The main event, draws everything so i don't have to use objects */
	onDraw(() => {
		EditorRenderer.trackBackground();
		EditorRenderer.stamps();
		EditorRenderer.strumline();
		EditorRenderer.minimap();
		EditorRenderer.noteCursor();
		EditorRenderer.selectSquares();
		EditorRenderer.selectionBox();
	});

	/** When a leading note is selected, this gets filled with times of how far every other selected thing was from the new leading note */
	let differencesToLeading = { notes: [], events: [] };
	function setLeading(stamp: ChartStamp) {
		ChartState.selectionBox.leadingStamp = stamp;

		differencesToLeading.notes = ChartState.song.chart.notes.map((note) => {
			return ChartState.conductor.timeToStep(note.time)
				- ChartState.conductor.timeToStep(ChartState.selectionBox.leadingStamp.time);
		});

		differencesToLeading.events = ChartState.song.chart.events.map((ev) => {
			return ChartState.conductor.timeToStep(ev.time)
				- ChartState.conductor.timeToStep(ChartState.selectionBox.leadingStamp.time);
		});
	}

	/** The event for stretching a note */
	let stretchingNoteEV: KEventController = null;

	// Behaviour for placing and selecting notes
	const leftMousePress = onMousePress("left", () => {
		/** The current hovered time */
		const hoveredTime = ChartState.conductor.stepToTime(
			ChartState.hoveredStep,
			ChartState.conductor.stepInterval,
		);

		function noteBehaviour() {
			let hoveredNote = EditorUtils.stamps.getHovered("note");

			// there's already a note in that place
			if (hoveredNote) {
				// if the note is not already selected
				if (!ChartState.selectedStamps.includes(hoveredNote)) {
					// if control is not down then reset the selected notes
					if (!isKeyDown("control")) ChartState.resetSelectedStamps();
					ChartState.selectedStamps.push(hoveredNote);
				}

				if (hoveredNote.length) {
					if (ChartState.hoveredStep == Math.round(ChartState.conductor.timeToStep(hoveredNote.time))) {
						setLeading(hoveredNote);
					}
				}
				else setLeading(hoveredNote);
			}
			// there's no note in that place
			else {
				if (ChartState.selectedStamps.length > 0) EditorCommands.DeselectAll();
				hoveredNote = ChartState.placeNote(hoveredTime, ChartState.currentMove);
				EditorUtils.noteSound(hoveredNote, "Add");

				setLeading(hoveredNote);

				stretchingNoteEV?.cancel();
				stretchingNoteEV = onMouseMove(() => {
					let oldLength = hoveredNote.length;
					const noteLength = Math.floor(
						(ChartState.hoveredStep)
							- ChartState.conductor.timeToStep(hoveredNote.time),
					);
					hoveredNote.length = noteLength > 0 ? noteLength : undefined;
					let newLength = hoveredNote.length;
					if (oldLength != newLength) {
						const detune = newLength % 2 == 0 ? 0 : 100;
						Sound.playSound("noteStretch", { detune: detune });
					}
				});

				const releaseEV = onMouseRelease(() => {
					if (hoveredNote.length) Sound.playSound("noteSnap", { detune: rand(-25, 25) });
					releaseEV.cancel();
					stretchingNoteEV?.cancel();
					stretchingNoteEV = null;
				});
			}

			ChartState.stepForDetune = ChartState.conductor.timeToStep(hoveredNote.time);
		}

		function eventBehaviour() {
			let hoveredEvent = EditorUtils.stamps.getHovered("event");

			// there's already an event in that place
			if (hoveredEvent) {
				if (!ChartState.selectedStamps.includes(hoveredEvent)) {
					if (!isKeyDown("control")) ChartState.resetSelectedStamps();
					ChartState.selectedStamps.push(hoveredEvent);
				}
			}
			else {
				ChartState.resetSelectedStamps();
				hoveredEvent = ChartState.placeEvent(hoveredTime, ChartState.currentEvent);
				Sound.playSound("noteAdd", { detune: rand(-50, 50) });
				Sound.playSound("eventCog", { detune: rand(-50, 50) });
			}

			setLeading(hoveredEvent);
			ChartState.stepForDetune = ChartState.conductor.timeToStep(hoveredEvent.time);
		}

		// if it's not on the grid at all simply reset selected notes
		if (!ChartState.isCursorInGrid) {
			// if it's not hovering anything clickable, deselect
			if (
				!get("hover", { recursive: true }).some((obj) => obj.isHovering())
				&& !get("editorTab").some((obj) => obj.isHovering)
			) {
				EditorCommands.DeselectAll();
			}
		}
		else {
			if (ChartState.isInNoteGrid) noteBehaviour();
			else if (ChartState.isInEventGrid) eventBehaviour();
		}
	});

	// Resets the detune for moving notes
	onMouseRelease("left", () => {
		ChartState.selectionBox.leadingStamp = undefined;
	});

	// Removing notes
	const rightMousePress = onMousePress("right", () => {
		if (!ChartState.isCursorInGrid) return;

		function noteBehaviour() {
			const note = EditorUtils.stamps.getHovered("note");
			if (!note) return;

			if (EditorUtils.stamps.trailAtStep(ChartState.hoveredStep)) {
				// if you click the trail instead of the note it will only remove the trail rather than the note
				note.length = undefined;
				Sound.playSound("noteSnap", { detune: -50 });
			}
			else {
				ChartState.deleteNote(note);
				EditorUtils.noteSound(note, "Remove");
			}
		}

		function eventBehaviour() {
			const hoveredEvent = EditorUtils.stamps.getHovered("event");

			if (!hoveredEvent) return;
			ChartState.deleteEvent(hoveredEvent);
			Sound.playSound("noteRemove");
			Sound.playSound("eventCog", { detune: rand(-50, 50) });
		}

		if (ChartState.isInNoteGrid) noteBehaviour();
		else if (ChartState.isInEventGrid) eventBehaviour();
	});

	// Behaviour for moving notes
	const rightMouseDown = onMouseDown("left", () => {
		if (stretchingNoteEV) return;
		if (!ChartState.selectionBox.leadingStamp) return;

		let oldStepOfLeading = ChartState.conductor.timeToStep(ChartState.selectionBox.leadingStamp.time);
		oldStepOfLeading = Math.round(oldStepOfLeading);

		ChartState.selectedStamps.forEach((selectedStamp, index) => {
			// is the leading stamp
			if (selectedStamp == ChartState.selectionBox.leadingStamp) {
				let newStep = ChartState.hoveredStep;
				newStep = clamp(newStep, 0, ChartState.conductor.totalSteps - 1);

				selectedStamp.time = ChartState.conductor.stepToTime(newStep);
				ChartState.selectionBox.leadingStamp = selectedStamp;
			}
			else {
				const isNote = EditorUtils.stamps.isNote(selectedStamp);

				const leadingStampStep = ChartState.conductor.timeToStep(ChartState.selectionBox.leadingStamp.time);

				if (isNote) {
					const indexInNotes = ChartState.song.chart.notes.indexOf(selectedStamp);

					// this is some big brain code i swear
					const stepDiff = differencesToLeading.notes[indexInNotes];
					let newStep = leadingStampStep + stepDiff;
					newStep = clamp(newStep, 0, ChartState.conductor.totalSteps - 1);
					selectedStamp.time = ChartState.conductor.stepToTime(newStep);
				}
				else {
					const indexInEvents = ChartState.song.chart.events.indexOf(selectedStamp);

					// this is some big brain code i swear
					const stepDiff = differencesToLeading.events[indexInEvents];
					let newStep = leadingStampStep + stepDiff;
					newStep = clamp(newStep, 0, ChartState.conductor.totalSteps - 1);
					selectedStamp.time = ChartState.conductor.stepToTime(newStep);
				}
			}
		});

		let newStepOfLeading = ChartState.conductor.timeToStep(ChartState.selectionBox.leadingStamp.time);
		newStepOfLeading = Math.round(newStepOfLeading);

		if (newStepOfLeading != oldStepOfLeading) {
			// thinking WAY too hard for a simple sound effect lol!
			const diff = newStepOfLeading - ChartState.stepForDetune;
			let baseDetune = 0;

			if (EditorUtils.stamps.isNote(ChartState.selectionBox.leadingStamp)) {
				baseDetune = Math.abs(EditorUtils.moveToDetune(ChartState.selectionBox.leadingStamp.move)) * 0.5;
			}
			else {
				baseDetune = Object.keys(ChartEvent.eventSchema).indexOf(ChartState.selectionBox.leadingStamp.id)
					* 10;
			}

			Sound.playSound("noteMove", { detune: baseDetune * diff });
		}
	});

	// Copies the color of a note
	onMousePress("middle", () => {
		if (ChartState.isInNoteGrid) {
			const currentHoveredNote = EditorUtils.stamps.getHovered("note");
			if (currentHoveredNote && ChartState.currentMove != currentHoveredNote.move) {
				ChartState.changeMove(currentHoveredNote.move);
			}
		}
		else {
			const currentHoveredEvent = EditorUtils.stamps.getHovered("event");
			if (currentHoveredEvent && ChartState.currentEvent != currentHoveredEvent.id) {
				ChartState.currentEvent = currentHoveredEvent.id as keyof typeof ChartEvent.eventSchema;
			}
		}
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
		if (ChartState.inputDisabled) return;
		if (get("textbox", { recursive: true }).some((textbox) => textbox.focused)) return;

		ChartState.inputDisabled = true;
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
		if (ChartState.inputDisabled) return;
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
		const note = EditorUtils.stamps.find("note", currentStep);
		if (note) ChartState.events.trigger("notehit", note);
	});

	onSceneLeave(() => {
		gameCursor.color = WHITE;
	});

	MenuBar.setup();
	EditorTab.setup();
});
