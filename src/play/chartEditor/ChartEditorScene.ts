// The actual scene for the chart editor
import { KEventController } from "kaplay";
import { v4 as uuidv4 } from "uuid";
import { Conductor } from "../../conductor";
import { onBeatHit, onNoteHit, onStepHit, triggerEvent } from "../../core/events";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { playMusic, playSound } from "../../core/plugins/features/sound";
import { transitionToScene } from "../../core/scenes";
import { fadeOut } from "../../core/transitions/fadeOutTransition";
import { GameDialog } from "../../ui/dialogs/gameDialog";
import { utils } from "../../utils";
import { moveToColor, notesSpawner } from "../objects/note";
import { getClosestNote } from "../objects/scoring";
import { paramsGameScene } from "../PlayState";
import { SongContent } from "../song";
import {
	addDummyDancer,
	addFloatingText,
	cameraHandler,
	ChartStamp,
	clipboardMessage,
	concatStamps,
	findNoteAtStep,
	fixStamps,
	isStampNote,
	moveHandler,
	moveToDetune,
	paramsChartEditor,
	selectionBoxHandler,
	setMouseAnimConditions,
	stampPropThing,
	StateChart,
	trailAtStep,
} from "./chartEditorBackend";
import { openChartAboutDialog, openChartInfoDialog, openEventDialog, openExitDialog } from "./chartEditorDialogs";
import {
	addDialogButtons,
	addEventsPanel,
	addLeftInfo,
	checkerboardRenderer,
	drawCameraController,
	drawNoteCursor,
	drawPlayBar,
	drawSelectionBox,
	drawSelectSquares,
	drawStrumline,
	NOTE_BIG_SCALE,
	SCROLL_LERP_VALUE,
	stampRenderer,
} from "./chartEditorElements";

export function ChartEditorScene() {
	scene("charteditor", (params: paramsChartEditor) => {
		// had an issue with BPM being NaN but it was because since this wasn't defined then it was NaN
		params.playbackSpeed = params.playbackSpeed ?? 1;
		params.seekTime = params.seekTime ?? 0;
		params.seekTime = Math.abs(params.seekTime);
		params.dancer = params.dancer ?? "astri";
		GameDialog.isOpen = false;

		const ChartState = new StateChart();
		setBackground(Color.fromArray(ChartState.bgColor));

		setMouseAnimConditions(ChartState);

		/** Gets the current note that is being hovered */
		function getCurrentHoveredNote() {
			return findNoteAtStep(ChartState.hoveredStep, ChartState);
		}

		function getCurrentHoveredEvent() {
			const time = ChartState.conductor.stepToTime(ChartState.hoveredStep, ChartState.conductor.stepInterval);
			return ChartState.song.chart.events.find((ev) =>
				ChartState.conductor.timeToStep(ev.time, ChartState.conductor.stepInterval)
					== ChartState.conductor.timeToStep(time, ChartState.conductor.stepInterval)
			);
		}

		// this sets the chartstate.song prop to new songcontent()
		// also sets the conductor
		// Creates a deep copy of the song so it doesn't overwrite the current song
		ChartState.song = JSON.parse(JSON.stringify(params.song)) as SongContent;
		// TODO: I have to do the thing where it actually overwrites the uuid to a new one fuck
		ChartState.conductor = new Conductor({
			audioPlay: playMusic(`${ChartState.song.manifest.uuid_DONT_CHANGE}-audio`, {
				speed: params.playbackSpeed,
			}),
			BPM: ChartState.song.manifest.initial_bpm * params.playbackSpeed,
			timeSignature: ChartState.song.manifest.time_signature,
			offset: 0,
		});

		ChartState.conductor.audioPlay.seek(params.seekTime);

		ChartState.params = params;
		ChartState.paused = true;
		ChartState.scrollToStep(ChartState.conductor.timeToStep(params.seekTime));

		ChartState.curSnapshotIndex = 0;

		ChartState.snapshots = [JSON.parse(JSON.stringify(ChartState))];
		let songDuration = 0;
		getSound(`${ChartState.song.manifest.uuid_DONT_CHANGE}-audio`).onLoad((data) => {
			songDuration = data.buf.duration;
			ChartState.audioBuffer = data.buf;
		});

		gameCursor.show();

		onUpdate(() => {
			const allStamps = concatStamps(ChartState.song.chart.notes, ChartState.song.chart.events);
			fixStamps(allStamps, ChartState);

			allStamps.forEach((stamp, index) => {
				const isNote = isStampNote(stamp);
				if (!ChartState.stampProps[isNote ? "notes" : "events"][index]) {
					ChartState.stampProps[isNote ? "notes" : "events"][index] = {
						scale: vec2(1),
						angle: 0,
					};
				}
			});

			// TODO: Do stuff for properly animating dancer
			ChartState.song.chart.events.forEach((ev) => {
				if (ChartState.conductor.timeInSeconds >= ev.time) {
					if (ChartState.doneEvents.includes(ev)) return;
					ChartState.doneEvents.push(ev);

					// do stuff here
					if (ev.id == "play-anim") {
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
					}
				}
				else {
					ChartState.doneEvents = utils.removeFromArr(ev, ChartState.doneEvents);
				}
			});

			dummyDancer.sprite = "dancer_" + ChartState.getDancerAtTime();
			ChartState.conductor.paused = ChartState.paused;

			// SCROLL STEP
			if (ChartState.paused == false) {
				ChartState.scrollToStep(ChartState.conductor.currentStep);
				ChartState.scrollTime = ChartState.conductor.timeInSeconds;
			}
			// not paused
			else {
				ChartState.scrollTime = ChartState.conductor.stepToTime(ChartState.scrollStep);
				ChartState.conductor.timeInSeconds = ChartState.scrollTime;
			}

			ChartState.lerpScrollStep = lerp(ChartState.lerpScrollStep, ChartState.scrollStep, SCROLL_LERP_VALUE);

			// MOUSE COLOR
			const currentColor = moveToColor(ChartState.currentMove);
			const mouseColor = utils.blendColors(WHITE, currentColor, 0.5);
			gameCursor.color = lerp(gameCursor.color, mouseColor, SCROLL_LERP_VALUE);

			// MANAGES some stuff for selecting
			ChartState.cursorPos.y = Math.floor(gameCursor.pos.y / ChartState.SQUARE_SIZE.y) * ChartState.SQUARE_SIZE.y
				+ ChartState.SQUARE_SIZE.y / 2;
			ChartState.cursorPos.x = Math.floor(gameCursor.pos.x / ChartState.SQUARE_SIZE.x) * ChartState.SQUARE_SIZE.x
				+ ChartState.SQUARE_SIZE.x - 8;
			ChartState.lerpCursorPos = lerp(ChartState.lerpCursorPos, ChartState.cursorPos, SCROLL_LERP_VALUE);

			ChartState.cursorGridRow = Math.floor(ChartState.cursorPos.y / ChartState.SQUARE_SIZE.y) - 0.5;
			ChartState.hoveredStep = Math.floor(ChartState.scrollStep + ChartState.cursorGridRow);

			// Handle move change input
			moveHandler(ChartState);

			selectionBoxHandler(ChartState);
			cameraHandler(ChartState);

			if (GameDialog.isOpen) return;

			let stepsToScroll = 0;

			// scroll up
			if (isKeyPressedRepeat("w") && ChartState.scrollStep > 0) {
				if (!ChartState.paused) ChartState.paused = true;
				if (isKeyDown("shift")) stepsToScroll = -10;
				else stepsToScroll = -1;
				ChartState.scrollStep += stepsToScroll;
			}
			// scroll down
			else if (isKeyPressedRepeat("s") && ChartState.scrollStep < ChartState.conductor.totalSteps - 1) {
				if (!ChartState.paused) ChartState.paused = true;
				if (isKeyDown("shift")) stepsToScroll = 10;
				else stepsToScroll = 1;
				ChartState.scrollStep += stepsToScroll;
			}
			// remove all selected notes
			else if (isKeyPressed("backspace")) {
				if (ChartState.selectedStamps.length == 0) return;
				ChartState.takeSnapshot();

				ChartState.selectedStamps.forEach((stamp) => {
					if (isStampNote(stamp)) ChartState.deleteNote(stamp);
					else ChartState.deleteEvent(stamp);
				});

				playSound("noteRemove", { detune: rand(-50, 50) });
				// there was an event in there
				if (ChartState.selectedStamps.some((stamp) => !isStampNote(stamp))) {
					playSound("eventCog", { detune: rand(-50, 50) });
				}

				ChartState.selectedStamps = [];
			}
			// undo
			else if (isKeyDown("control") && isKeyPressedRepeat("z")) {
				let oldSongState = ChartState.song;
				ChartState.undo();

				if (oldSongState != ChartState.song) {
					playSound("noteUndo", { detune: rand(-50, -25) });
				}
			}
			// redo
			else if (isKeyDown("control") && isKeyPressedRepeat("y")) {
				let oldSongState = ChartState.song;
				ChartState.redo();

				if (oldSongState != ChartState.song) {
					playSound("noteUndo", { detune: rand(25, 50) });
				}
			}
			// copy
			else if (isKeyDown("control") && isKeyPressed("c")) {
				if (ChartState.selectedStamps.length == 0) return;

				ChartState.clipboard = ChartState.selectedStamps;
				addFloatingText(clipboardMessage("copy", ChartState.clipboard));
				playSound("noteCopy", { detune: rand(25, 50) });

				ChartState.selectedStamps.forEach((stamp) => {
					if (isStampNote(stamp)) {
						const indexInNotes = ChartState.song.chart.notes.indexOf(stamp);
						tween(
							choose([-1, 1]) * 20,
							0,
							0.5,
							(p) => ChartState.stampProps.notes[indexInNotes].angle = p,
							easings.easeOutExpo,
						);
						tween(
							vec2(1.2),
							vec2(1),
							0.5,
							(p) => ChartState.stampProps.notes[indexInNotes].scale = p,
							easings.easeOutExpo,
						);
					}
					else {
						const indexInEvents = ChartState.song.chart.events.indexOf(stamp);
						tween(
							choose([-1, 1]) * 20,
							0,
							0.5,
							(p) => ChartState.stampProps.events[indexInEvents].angle = p,
							easings.easeOutExpo,
						);
						tween(
							vec2(1.2),
							vec2(1),
							0.5,
							(p) => ChartState.stampProps.events[indexInEvents].scale = p,
							easings.easeOutExpo,
						);
					}
				});
			}
			// cut
			else if (isKeyDown("control") && isKeyPressed("x")) {
				if (ChartState.selectedStamps.length == 0) return;

				// some code from the copy action
				ChartState.clipboard = ChartState.selectedStamps;
				addFloatingText(clipboardMessage("cut", ChartState.clipboard));
				playSound("noteCopy", { detune: rand(0, 25) });

				ChartState.selectedStamps.forEach((stamp) => {
					if (isStampNote(stamp)) {
						ChartState.deleteNote(stamp);
					}
					else {
						ChartState.deleteEvent(stamp);
					}
				});
			}
			// paste
			else if (isKeyDown("control") && isKeyPressed("v")) {
				if (ChartState.clipboard.length == 0) return;
				playSound("noteCopy", { detune: rand(-50, -25) });
				addFloatingText(clipboardMessage("paste", ChartState.clipboard));

				ChartState.clipboard.forEach((stamp) => {
					const newTime = stamp.time + ChartState.conductor.stepToTime(ChartState.hoveredStep - 3.5);

					if (isStampNote(stamp)) {
						const newNote = ChartState.placeNote(newTime, stamp.move);
						const indexInNotes = ChartState.song.chart.notes.indexOf(newNote);
						if (indexInNotes == -1) return;
						tween(
							choose([-1, 1]) * 20,
							0,
							0.5,
							(p) => ChartState.stampProps.notes[indexInNotes].angle = p,
							easings.easeOutExpo,
						);
					}
					else {
						const newEvent = ChartState.placeEvent(newTime, stamp.id);
						const indexInEvents = ChartState.song.chart.events.indexOf(newEvent);
						if (indexInEvents == -1) return;
						tween(
							choose([-1, 1]) * 20,
							0,
							0.5,
							(p) => ChartState.stampProps.events[indexInEvents].angle = p,
							easings.easeOutExpo,
						);
					}
				});

				// shickiiii
				ChartState.takeSnapshot();
			}
			// select all!
			else if (isKeyDown("control") && isKeyPressed("a")) {
				concatStamps(ChartState.song.chart.notes, ChartState.song.chart.events).forEach((stamp) => {
					if (ChartState.selectedStamps.includes(stamp)) return;
					ChartState.selectedStamps.push(stamp);
				});
			}
			else if (isKeyPressed("e")) {
				openChartInfoDialog(ChartState);
			}
			else if (isKeyPressed("r")) {
				openChartAboutDialog();
			}
		});

		// this is done like this so it's drawn on top of everything
		const selectDraw = add([
			z(1),
		]);

		selectDraw.onDraw(() => {
			if (GameDialog.isOpen) return;
			drawSelectionBox(ChartState);
		});

		/** The main event, draws everything so i don't have to use objects */
		onDraw(() => {
			checkerboardRenderer(ChartState);
			stampRenderer(ChartState);
			drawStrumline(ChartState);
			drawCameraController(ChartState);
			drawPlayBar(ChartState);

			if (GameDialog.isOpen) return;
			drawNoteCursor(ChartState);
			drawSelectSquares(ChartState);
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
		onMousePress("left", () => {
			if (GameDialog.isOpen) return;

			/** The current hovered time */
			const hoveredTime = ChartState.conductor.stepToTime(
				ChartState.hoveredStep,
				ChartState.conductor.stepInterval,
			);

			function noteBehaviour() {
				let hoveredNote = getCurrentHoveredNote();

				// there's already a note in that place
				if (hoveredNote) {
					// if the note is not already selected
					if (!ChartState.selectedStamps.includes(hoveredNote)) {
						// if control is not down then reset the selected notes
						if (!isKeyDown("control")) ChartState.resetSelectedStamps();
						ChartState.selectedStamps.push(hoveredNote);
						ChartState.takeSnapshot();
					}

					if (hoveredNote.length) {
						if (ChartState.hoveredStep == Math.round(ChartState.conductor.timeToStep(hoveredNote.time))) setLeading(hoveredNote);
					}
					else setLeading(hoveredNote);
				}
				// there's no note in that place
				else {
					ChartState.resetSelectedStamps();
					hoveredNote = ChartState.placeNote(hoveredTime, ChartState.currentMove);
					playSound("noteAdd", { detune: moveToDetune(hoveredNote.move) });
					ChartState.takeSnapshot();

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
							const detune = newLength % 2 == 0 ? 0 : 50;
							playSound("noteStretch", { detune: detune });
						}
					});

					const releaseEV = onMouseRelease(() => {
						playSound("noteSnap");
						releaseEV.cancel();
						stretchingNoteEV?.cancel();
						stretchingNoteEV = null;
					});
				}

				ChartState.stepForDetune = ChartState.conductor.timeToStep(hoveredNote.time);
			}

			function eventBehaviour() {
				let hoveredEvent = getCurrentHoveredEvent();

				// there's already an event in that place
				if (hoveredEvent) {
					if (isKeyDown("shift")) {
						openEventDialog(hoveredEvent, ChartState);
					}

					if (!ChartState.selectedStamps.includes(hoveredEvent)) {
						if (!isKeyDown("control")) ChartState.resetSelectedStamps();
						ChartState.selectedStamps.push(hoveredEvent);
						ChartState.takeSnapshot();
					}
				}
				else {
					ChartState.selectedStamps = [];
					hoveredEvent = ChartState.placeEvent(hoveredTime, ChartState.currentEvent);
					playSound("noteAdd", { detune: rand(-50, 50) });
					playSound("eventCog", { detune: rand(-50, 50) });
					ChartState.takeSnapshot();
				}

				setLeading(hoveredEvent);
				ChartState.stepForDetune = ChartState.conductor.timeToStep(hoveredEvent.time);
			}

			// if it's not on the grid at all simply reset selected notes
			if (!ChartState.isCursorInGrid) {
				ChartState.resetSelectedStamps();
				return;
			}
			else {
				if (ChartState.isInNoteGrid) noteBehaviour();
				else if (ChartState.isInEventGrid) eventBehaviour();
			}
		});

		// Resets the detune for moving notes
		onMouseRelease("left", () => {
			if (GameDialog.isOpen) return;
			ChartState.selectionBox.leadingStamp = undefined;
		});

		// Removing notes
		onMousePress("right", () => {
			if (GameDialog.isOpen) return;
			if (!ChartState.isCursorInGrid) return;

			function noteBehaviour() {
				const note = getCurrentHoveredNote();

				if (trailAtStep(ChartState.hoveredStep, ChartState)) {
					// if you click the trail instead of the note it will only remove the trail rather than the note
					note.length = undefined;
					playSound("noteSnap", { detune: -50 });
					ChartState.takeSnapshot();
				}
				else {
					ChartState.deleteNote(note);
					playSound("noteRemove", { detune: moveToDetune(note.move) });
					ChartState.takeSnapshot();
				}
			}

			function eventBehaviour() {
				const hoveredEvent = getCurrentHoveredEvent();
				if (!hoveredEvent) return;
				ChartState.deleteEvent(hoveredEvent);
				playSound("noteRemove");
				playSound("eventCog", { detune: rand(-50, 50) });
				ChartState.takeSnapshot();
			}

			if (ChartState.isInNoteGrid) noteBehaviour();
			else if (ChartState.isInEventGrid) eventBehaviour();
		});

		// Behaviour for moving notes
		onMouseDown("left", () => {
			if (stretchingNoteEV) return;
			if (GameDialog.isOpen) return;
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
					const isNote = isStampNote(selectedStamp);

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

				if (isStampNote(ChartState.selectionBox.leadingStamp)) {
					baseDetune = Math.abs(moveToDetune(ChartState.selectionBox.leadingStamp.move)) * 0.5;
				}
				else {
					baseDetune = Object.keys(ChartState.events).indexOf(ChartState.selectionBox.leadingStamp.id) * 10;
				}

				playSound("noteMove", { detune: baseDetune * diff });
				ChartState.takeSnapshot();
			}
		});

		// Copies the color of a note
		onMousePress("middle", () => {
			if (GameDialog.isOpen) return;

			if (ChartState.isInNoteGrid) {
				const currentHoveredNote = getCurrentHoveredNote();
				if (currentHoveredNote && ChartState.currentMove != currentHoveredNote.move) {
					ChartState.changeMove(currentHoveredNote.move);
				}
			}
			else {
				const currentHoveredEvent = getCurrentHoveredEvent();
				if (currentHoveredEvent && ChartState.currentEvent != currentHoveredEvent.id) {
					ChartState.currentEvent = currentHoveredEvent.id;
				}
			}
		});

		// The scroll event
		onScroll((delta) => {
			if (GameDialog.isOpen) return;
			let scrollPlus = 0;
			if (!ChartState.paused) ChartState.paused = true;

			if (ChartState.scrollStep == 0 && delta.y < 0) scrollPlus = 0;
			else if (ChartState.scrollStep == ChartState.conductor.totalSteps && delta.y > 0) scrollPlus = 0;
			else {
				if (delta.y >= 1) scrollPlus = 1;
				else scrollPlus = -1;
			}

			if (
				ChartState.scrollStep == ChartState.conductor.totalSteps && scrollPlus > 0
				|| ChartState.scrollStep - 1 < 0 && scrollPlus < 0
			) return;
			ChartState.scrollStep += scrollPlus;
		});

		// Send you to the game
		onKeyPress("enter", async () => {
			if (GameDialog.isOpen) return;
			if (ChartState.inputDisabled) return;
			ChartState.inputDisabled = true;
			ChartState.paused = true;

			const loadedNormally = await getSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio");

			// the song is not loaded with the id format name
			// or the buffer of the sound isn't the same as the buffer of the current song
			if (!loadedNormally || loadedNormally.buf != ChartState.audioBuffer) {
				// then gets the new title and loads it now with the good name
				await loadSound(ChartState.song.manifest.uuid_DONT_CHANGE + "-audio", ChartState.audioBuffer);
			}

			// transition to scene normally
			transitionToScene(
				fadeOut,
				"game",
				{
					songZip: ChartState.song,
					seekTime: ChartState.scrollTime,
					dancer: params.dancer,
					fromChartEditor: true,
				} as paramsGameScene,
			);
		});

		// Pausing unpausing behaviour
		onKeyPress("space", () => {
			if (GameDialog.isOpen) return;
			if (ChartState.inputDisabled) return;
			ChartState.paused = !ChartState.paused;

			if (ChartState.paused == false) {
				// all of this is kinda like a math.ceil(), fixes the weird stutter
				const timeToStep = ChartState.conductor.timeToStep(ChartState.conductor.timeInSeconds);
				ChartState.scrollToStep(timeToStep);
				const newTime = ChartState.conductor.stepToTime(ChartState.scrollStep);
				ChartState.conductor.audioPlay.seek(newTime);
			}
		});

		onKeyPress("escape", () => {
			if (GameDialog.isOpen) return;
			openExitDialog();
		});

		const dummyDancer = addDummyDancer(ChartState.params.dancer);

		// makes the strumline BOP
		onBeatHit(() => {
			tween(vec2(1.2), vec2(1), 0.1, (p) => ChartState.strumlineScale = p);
			if (dummyDancer.currentMove == "idle") dummyDancer.moveBop();
		});

		// Scrolls the checkerboard
		onStepHit(() => {
			const stampsAtStep = concatStamps(ChartState.song.chart.notes, ChartState.song.chart.events).filter((stamp) => {
				return Math.round(ChartState.conductor.timeToStep(stamp.time))
					== Math.round(ChartState.conductor.timeToStep(ChartState.conductor.timeInSeconds));
			});

			stampsAtStep.forEach((stamp) => {
				const isNote = isStampNote(stamp);
				if (isNote) {
					const indexOfNote = ChartState.song.chart.notes.indexOf(stamp);

					if (stamp.length) {
						const ogScale = ChartState.stampProps.notes[indexOfNote].scale;
						tween(ogScale, NOTE_BIG_SCALE, 0.05, (p) => ChartState.stampProps.notes[indexOfNote].scale = p);
					}
					else {
						tween(NOTE_BIG_SCALE, vec2(1), 0.1, (p) => ChartState.stampProps.notes[indexOfNote].scale = p);
					}
					playSound("noteHit", { detune: moveToDetune(stamp.move) });
					triggerEvent("onNoteHit", stamp);
				}
				else {
					const indexOfEv = ChartState.song.chart.events.indexOf(stamp);
					tween(NOTE_BIG_SCALE, vec2(1), 0.1, (p) => ChartState.stampProps.events[indexOfEv].scale = p);
				}
			});

			// find the ones that are long and are big so they can be un-bigged
			ChartState.stampProps.notes.filter((prop) => prop.scale.x > 1).forEach((prop) => {
				const note = ChartState.song.chart.notes[ChartState.stampProps.notes.indexOf(prop)];
				const stepOfNote = ChartState.conductor.timeToStep(note.time);
				if (ChartState.scrollStep > stepOfNote + note.length) {
					tween(prop.scale, vec2(1), 0.1, (p) => prop.scale = p);
				}
			});
		});

		// animate the dancer
		onNoteHit((note) => {
			dummyDancer.doMove(note.move);
		});

		onSceneLeave(() => {
			gameCursor.color = WHITE;
		});

		addDialogButtons(ChartState);
		addLeftInfo(ChartState);
		addEventsPanel(ChartState);

		getTreeRoot().on("dialogOpen", () => ChartState.paused = true);
	});
}
