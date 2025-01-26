import { KEventController } from "kaplay";
import { StateChart } from "../EditorState";
import { EditorEvent, EditorNote, EditorStamp } from "../objects/stamp";

/** Function that contains the whole mouse controls for the editor (placing stamps, selecting stamps, moving stamps, etc) */
export function mouseControls() {
	return onMousePress((button) => {
		const ChartState = StateChart.instance;

		/** The event for stretching a note */
		let stretchingNoteEV: KEventController = undefined;
		let hoveredStamp = EditorStamp.mix(ChartState.notes, ChartState.events).find((stamp) => stamp.isHovering(true));
		let startingStep = ChartState.hoveredStep;
		const inGridAtClick = ChartState.isInNoteLane || ChartState.isInEventLane;

		// #region PRESS

		// clicked outside the grid
		if (!inGridAtClick) {
			const releasedOutsideTheGrid = onMouseRelease("left", () => {
				releasedOutsideTheGrid.cancel();
				StateChart.commands.DeselectAll();
			});
		}
		else {
			if (hoveredStamp) {
				if (!hoveredStamp.selected) {
					if (!isKeyDown("control")) StateChart.commands.DeselectAll();
					hoveredStamp.selected = true;
				}
				else {
					if (hoveredStamp.is("note")) hoveredStamp.twitch(2.5);
				}

				if (hoveredStamp.is("event")) {
					ChartState.events.filter((ev) => ev != hoveredStamp).forEach((ev) => ev.beingEdited = false);
					hoveredStamp.beingEdited = !hoveredStamp.beingEdited;
					if (hoveredStamp.beingEdited) {
						hoveredStamp.twist();
						hoveredStamp.bop();
						hoveredStamp.editSound();
					}
				}
			}
			else StateChart.commands.DeselectAll();
		}

		// #region placing
		if (button == "left") {
			// placing notes
			if (ChartState.isInNoteLane) {
				if (!hoveredStamp) {
					const note = StateChart.commands.PlaceNote(true);
					stretchingNoteEV?.cancel();
					stretchingNoteEV = onMouseMove(() => {
						let oldLength = note.data.length;
						const noteLength = Math.floor(ChartState.hoveredStep - note.step);
						note.data.length = noteLength > 0 ? noteLength : undefined;
						let newLength = note.data.length;
						if (oldLength != newLength) {
							note.stretchSound();
						}
					});

					const releaseEV = onMouseRelease(() => {
						if (note.data.length) note.snapSound();
						releaseEV.cancel();
						stretchingNoteEV?.cancel();
						stretchingNoteEV = undefined;
					});
				}
			}
			// placing events
			else if (ChartState.isInEventLane) {
				if (!hoveredStamp) {
					const event = StateChart.commands.PlaceEvent(true);
				}
			}
		}
		// #endregion placing
		// #region deleting
		else if (button == "right") {
			// delete note
			if (ChartState.isInNoteLane) {
				if (hoveredStamp) {
					const note = hoveredStamp as EditorNote;
					if (EditorNote.trailAtStep()) {
						note.data.length = undefined;
						note.snapSound();
					}
					else StateChart.commands.DeleteNote(true, note);
				}
			}
			// delete event
			else if (ChartState.isInEventLane) {
				const event = hoveredStamp as EditorEvent;
				if (event) {
					StateChart.commands.DeleteEvent(true, event);
					event.deleteSound();
				}
			}
		}
		// #endregion deleting
		// #region copying type
		else if (button == "middle") {
			// copying note type
			if (ChartState.isInNoteLane) {
				const hoveredNote = hoveredStamp as EditorNote;
				if (hoveredNote) ChartState.currentMove = hoveredNote.data.move;
			}
			// copying event type
			else if (ChartState.isInEventLane) {
				const hoveredEvent = hoveredStamp as EditorEvent;
				if (hoveredEvent) ChartState.currentEvent = hoveredEvent.data.id;
			}
		}
		// #endregionregion copying type

		// will only run if the button was left
		if (button != "left") return;

		const differencesToHover = { notes: [] as number[], events: [] as number[] };
		hoveredStamp = EditorStamp.mix(ChartState.notes, ChartState.events).find((stamp) => stamp.isHovering());

		// recalculate all differences to leading
		differencesToHover.notes = ChartState.notes.map((note) => {
			return note.step - ChartState.hoveredStep;
		});

		differencesToHover.events = ChartState.events.map((event) => {
			return event.step - ChartState.hoveredStep;
		});

		// #endregion press

		// #region DOWN
		const onMouseDownEV = onMouseDown("left", () => {
			if (!inGridAtClick) return; // will run if clicked inside the grid
			if (stretchingNoteEV) return;
			// if not enough notes and you haven't moved then don't do nothing
			if (ChartState.selected.length < 2 && ChartState.hoveredStep == startingStep) return;

			let oldTime = ChartState.conductor.stepToTime(hoveredStamp.step);

			// is the actual thing that changes the step of the note
			ChartState.selected.forEach((stamp) => {
				// this stamp must always be "stepDiff" steps away from leaderStampStep
				if (stamp.is("note")) {
					const stepDiff = differencesToHover.notes[ChartState.notes.indexOf(stamp)];
					stamp.step = ChartState.hoveredStep + stepDiff;
				}
				else if (stamp.is("event")) {
					const stepDiff = differencesToHover.events[ChartState.events.indexOf(stamp)];
					stamp.step = ChartState.hoveredStep + stepDiff;
				}
			});

			let newTime = ChartState.conductor.stepToTime(hoveredStamp.step);

			if (newTime != oldTime) {
				// thinking WAY too hard for a simple sound effect lol!
				const diff = ChartState.conductor.timeToStep(newTime) - startingStep;
				const theSound = choose(ChartState.selected).moveSound();
				theSound.detune *= diff;
			}
		});
		// #endregion DOWN

		// #region RELEASE
		const onMouseReleaseEV = onMouseRelease("left", () => {
			onMouseDownEV.cancel();
			onMouseReleaseEV.cancel();
		});
		// #endregion RELEASE
	});
}
