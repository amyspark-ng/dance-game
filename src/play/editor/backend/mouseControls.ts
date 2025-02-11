import { KEventController } from "kaplay";
import { isSomeHovered } from "../../../core/cursor";
import { EditorState } from "../EditorState";
import { EditorEvent, EditorNote, EditorStamp } from "../objects/stamp";
import { commands } from "./commands";

/** Function that contains the whole mouse controls for the editor (placing stamps, selecting stamps, moving stamps, etc) */
export function mouseControls() {
	return onMousePress((button) => {
		const state = EditorState.instance;

		/** The event for stretching a note */
		let stretchingNoteEV: KEventController = undefined;
		let hoveredStamp = EditorStamp.mix(state.notes, state.events).find((stamp) => stamp.isHovering(true));
		let startingStep = state.hoveredStep;
		const inGridAtClick = state.isInNoteLane || state.isInEventLane;

		// #region PRESS

		// clicked outside the grid
		if (!inGridAtClick) {
			const releasedOutsideTheGrid = onMouseRelease("left", () => {
				releasedOutsideTheGrid.cancel();
				if (!isSomeHovered()) EditorState.instance.performCommand("SelectStamps", []);
			});
		}
		else {
			if (hoveredStamp) {
				if (!hoveredStamp.selected) {
					if (!isKeyDown("control")) EditorState.instance.performCommand("SelectStamps", []);
					hoveredStamp.selected = true;
				}
				else {
					if (hoveredStamp.is("note")) hoveredStamp.twitch(2.5);
				}

				if (hoveredStamp.is("event")) {
					state.events.filter((ev) => ev != hoveredStamp).forEach((ev) => ev.beingEdited = false);
					hoveredStamp.beingEdited = !hoveredStamp.beingEdited;
					if (hoveredStamp.beingEdited) {
						hoveredStamp.twist();
						hoveredStamp.bop();
						hoveredStamp.editSound();
					}
				}
			}
			else EditorState.instance.performCommand("SelectStamps", []);
		}

		// #region placing
		if (button == "left") {
			// placing notes
			if (state.isInNoteLane) {
				if (!hoveredStamp) {
					const note = EditorState.instance.performCommand("PlaceNote", true);
					stretchingNoteEV?.cancel();
					stretchingNoteEV = onMouseMove(() => {
						let oldLength = note.data.length;
						const noteLength = Math.floor(state.hoveredStep - note.step);
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
			else if (state.isInEventLane) {
				if (!hoveredStamp) {
					const event = EditorState.instance.performCommand("PlaceEvent", true);
				}
			}
		}
		// #endregion placing
		// #region deleting
		else if (button == "right") {
			// delete note
			if (state.isInNoteLane) {
				if (hoveredStamp) {
					const note = hoveredStamp as EditorNote;
					if (EditorNote.trailAtStep()) {
						note.data.length = undefined;
						note.snapSound();
					}
					else EditorState.instance.performCommand("DeleteNote", true, note);
				}
			}
			// delete event
			else if (state.isInEventLane) {
				const event = hoveredStamp as EditorEvent;
				if (event) {
					EditorState.instance.performCommand("DeleteEvent", true, event);
					event.deleteSound();
				}
			}
		}
		// #endregion deleting
		// #region copying type
		else if (button == "middle") {
			// copying note type
			if (state.isInNoteLane) {
				const hoveredNote = hoveredStamp as EditorNote;
				if (hoveredNote) state.currentMove = hoveredNote.data.move;
			}
			// copying event type
			else if (state.isInEventLane) {
				const hoveredEvent = hoveredStamp as EditorEvent;
				if (hoveredEvent) state.currentEvent = hoveredEvent.data.id;
			}
		}
		// #endregionregion copying type

		// will only run if the button was left
		if (button != "left") return;

		const differencesToHover = { notes: [] as number[], events: [] as number[] };
		hoveredStamp = EditorStamp.mix(state.notes, state.events).find((stamp) => stamp.isHovering());

		// recalculate all differences to leading
		differencesToHover.notes = state.notes.map((note) => {
			return note.step - state.hoveredStep;
		});

		differencesToHover.events = state.events.map((event) => {
			return event.step - state.hoveredStep;
		});

		// #endregion press

		// #region DOWN
		const onMouseDownEV = onMouseDown("left", () => {
			if (!inGridAtClick) return; // will run if clicked inside the grid
			if (stretchingNoteEV) return;
			// if not enough notes and you haven't moved then don't do nothing
			if (state.selected.length < 2 && state.hoveredStep == startingStep) return;
			if (!hoveredStamp) return;

			let oldTime = state.conductor.stepToTime(hoveredStamp.step);

			// is the actual thing that changes the step of the note
			state.selected.forEach((stamp) => {
				// this stamp must always be "stepDiff" steps away from leaderStampStep
				if (stamp.is("note")) {
					const stepDiff = differencesToHover.notes[state.notes.indexOf(stamp)];
					stamp.step = state.hoveredStep + stepDiff;
				}
				else if (stamp.is("event")) {
					const stepDiff = differencesToHover.events[state.events.indexOf(stamp)];
					stamp.step = state.hoveredStep + stepDiff;
				}
			});

			let newTime = state.conductor.stepToTime(hoveredStamp.step);

			if (newTime != oldTime) {
				// thinking WAY too hard for a simple sound effect lol!
				const diff = state.conductor.timeToStep(newTime) - startingStep;
				const theSound = choose(state.selected).moveSound();
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
