// The actual scene for the chart editor
import { KEventController } from "kaplay";
import { onBeatHit, onStepHit, triggerEvent } from "../../core/events";
import { gameCursor } from "../../core/plugins/features/gameCursor";
import { playSound } from "../../core/plugins/features/sound";
import { transitionToScene } from "../../core/scenes";
import { fadeOut } from "../../core/transitions/fadeOutTransition";
import { utils } from "../../utils";
import { ChartNote } from "../objects/note";
import { paramsGameScene } from "../PlayState";
import {
	checkerboardRenderer,
	drawMinimap,
	drawNoteCursor,
	drawSelectionBox,
	drawSelectSquares,
	drawStrumline,
	PROP_BIG_SCALE,
	SCROLL_LERP_VALUE,
	stampRenderer,
} from "./editorRenderer";
import {
	ChartStamp,
	concatStamps,
	findStampAtStep,
	fixStamp,
	isStampNote,
	minimapHandler,
	moveHandler,
	moveToDetune,
	paramsChartEditor,
	parseActions,
	selectionBoxHandler,
	setMouseAnimConditions,
	StateChart,
	trailAtStep,
} from "./EditorState";
import { addEditorTabs } from "./editorTabs";
import { addTopMenuButtons } from "./editorTopmenu";

export function ChartEditorScene() {
	scene("charteditor", (params: paramsChartEditor) => {
		const ChartState = new StateChart(params);

		onDraw(() => {
			drawRect({
				width: width(),
				height: height(),
				color: ChartState.bgColor,
			});
		});

		gameCursor.show();
		setMouseAnimConditions(ChartState);

		/** Gets the current note that is being hovered */
		function getCurrentHoveredNote() {
			return findStampAtStep(ChartState.hoveredStep, ChartState).note();
		}

		function getCurrentHoveredEvent() {
			return ChartState.song.chart.events.find((ev) => {
				return Math.round(ChartState.conductor.timeToStep(ev.time)) == ChartState.hoveredStep;
			});
		}

		onUpdate(() => {
			parseActions(ChartState);

			debug.log(ChartState.input.shortcutEnabled);

			// ChartState.bgColor = Color.fromHSL(GameSave.editorHue, 0.45, 0.48);
			ChartState.bgColor = rgb(92, 50, 172);

			// STAMPS
			const allStamps = concatStamps(ChartState.song.chart.notes, ChartState.song.chart.events);
			allStamps.forEach((stamp, index) => {
				fixStamp(stamp, ChartState);

				const isNote = isStampNote(stamp);
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

			// Handle move change input
			moveHandler(ChartState);

			selectionBoxHandler(ChartState);
			minimapHandler(ChartState);

			let stepsToScroll = 0;

			// scroll up
			if (isKeyPressedRepeat("w") && ChartState.scrollStep > 0) {
				if (!ChartState.paused) ChartState.paused = true;
				if (isKeyDown("shift")) stepsToScroll = -10;
				else stepsToScroll = -1;
				ChartState.scrollToStep(ChartState.scrollStep + stepsToScroll);
			}
			// scroll down
			else if (isKeyPressedRepeat("s") && ChartState.scrollStep < ChartState.conductor.totalSteps - 1) {
				if (!ChartState.paused) ChartState.paused = true;
				if (isKeyDown("shift")) stepsToScroll = 10;
				else stepsToScroll = 1;
				ChartState.scrollToStep(ChartState.scrollStep + stepsToScroll);
			}
			// scroll left nah just messing with you closest beat
			if (isKeyPressedRepeat("a") && ChartState.scrollStep > 0) {
				if (!ChartState.paused) ChartState.paused = true;
				// TODO: do this lol
			}

			// ceil to closest beat
			if (isKeyPressedRepeat("right") && ChartState.scrollStep > 0) {
				if (!ChartState.paused) ChartState.paused = true;
			}

			leftMousePress.paused = !ChartState.input.trackEnabled;
			rightMousePress.paused = !ChartState.input.trackEnabled;
			rightMouseDown.paused = !ChartState.input.trackEnabled;
		});

		// this is done like this so it's drawn on top of everything
		const selectDraw = add([
			z(1),
		]);

		selectDraw.onDraw(() => {
			drawSelectionBox(ChartState);
		});

		/** The main event, draws everything so i don't have to use objects */
		onDraw(() => {
			checkerboardRenderer(ChartState);
			stampRenderer(ChartState);
			drawStrumline(ChartState);
			drawMinimap(ChartState);
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
		const leftMousePress = onMousePress("left", () => {
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
						if (ChartState.hoveredStep == Math.round(ChartState.conductor.timeToStep(hoveredNote.time))) {
							setLeading(hoveredNote);
						}
					}
					else setLeading(hoveredNote);
				}
				// there's no note in that place
				else {
					ChartState.commands.Deselect.action();
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
							const detune = newLength % 2 == 0 ? 0 : 100;
							playSound("noteStretch", { detune: detune });
						}
					});

					const releaseEV = onMouseRelease(() => {
						if (hoveredNote.length) playSound("noteSnap", { detune: rand(-25, 25) });
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
					if (!ChartState.selectedStamps.includes(hoveredEvent)) {
						if (!isKeyDown("control")) ChartState.resetSelectedStamps();
						ChartState.selectedStamps.push(hoveredEvent);
						ChartState.takeSnapshot();
					}
				}
				else {
					ChartState.resetSelectedStamps();
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
				// if it's not hovering anything clickable, deselect
				if (
					!get("hover", { recursive: true }).some((obj) => obj.isHovering())
					&& !get("editorTab").some((obj) => obj.isHovering)
				) {
					ChartState.commands.Deselect.action();
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
				const note = getCurrentHoveredNote();
				if (!note) return;

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
			if (ChartState.isInNoteGrid) {
				const currentHoveredNote = getCurrentHoveredNote();
				if (currentHoveredNote && ChartState.currentMove != currentHoveredNote.move) {
					ChartState.changeMove(currentHoveredNote.move);
				}
			}
			else {
				const currentHoveredEvent = getCurrentHoveredEvent();
				if (currentHoveredEvent && ChartState.currentEvent != currentHoveredEvent.id) {
					ChartState.currentEvent = currentHoveredEvent.id as keyof typeof ChartState.events;
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
					ChartState.strumlineStep = clamp(ChartState.strumlineStep, 0, ChartState.conductor.totalSteps);
				}
			}
			else {
				// scroll step
				if (ChartState.scrollStep >= 0 && ChartState.scrollStep < ChartState.conductor.totalSteps) {
					ChartState.scrollToStep(ChartState.scrollStep + scrollPlus);
				}
			}
		});

		// Send you to the game
		onKeyPress("enter", async () => {
			if (ChartState.inputDisabled) return;
			if (get("textbox", { recursive: true }).some((textbox) => textbox.focused)) return;

			ChartState.inputDisabled = true;
			ChartState.paused = true;

			// transition to scene normally
			transitionToScene(
				fadeOut,
				"game",
				{
					song: ChartState.song,
					seekTime: ChartState.conductor.timeInSeconds,
					dancer: params.dancer,
					fromChartEditor: true,
				} as paramsGameScene,
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
		onBeatHit(() => {
			tween(vec2(1.2), vec2(1), 0.1, (p) => ChartState.strumlineScale = p);
		});

		// Scrolls the checkerboard
		onStepHit(() => {
			const allStamps = concatStamps(ChartState.song.chart.notes, ChartState.song.chart.events);
			const step = ChartState.conductor.currentStep;

			let currentStamp: ChartStamp = null;
			allStamps.forEach((stamp) => {
				// @ts-ignore
				const index = ChartState.song.chart[isStampNote(stamp) ? "notes" : "events"].indexOf(stamp);
				const stampStep = ChartState.conductor.timeToStep(stamp.time);
				const prop = ChartState.stampProps[isStampNote(stamp) ? "notes" : "events"][index];
				if (!prop) return;

				const noteAtStep = findStampAtStep(step, ChartState).note();
				if (stampStep == step || noteAtStep == stamp) {
					prop.scale = lerp(prop.scale, vec2(PROP_BIG_SCALE), ChartState.LERP);
					if (trailAtStep(step, ChartState)) currentStamp = stamp;
					else currentStamp = null;
				}
				else {
					prop.scale = lerp(prop.scale, vec2(1), ChartState.LERP);
				}
			});

			if (!ChartState.paused) {
				if (!currentStamp) return;
				if (isStampNote(currentStamp)) {
					triggerEvent("onNoteHit", currentStamp);
				}
				else ChartState.triggerEvent(currentStamp.id as keyof typeof ChartState.events);
			}
		});

		onSceneLeave(() => {
			gameCursor.color = WHITE;
		});

		addTopMenuButtons(ChartState);
		addEditorTabs(ChartState);
	});
}
