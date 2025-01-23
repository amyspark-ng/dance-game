// Function overloading is pretty cool pretty powerful for this specific case :)

import { Vec2 } from "kaplay";
import { utils } from "../../../utils";
import { Move } from "../../objects/dancer";
import { StateChart } from "../EditorState";
import { EditorEvent, EditorNote, EditorStamp } from "../objects/stamp";

export function addFloatyText(texting: string) {
	const texty = add([
		text(texting, { align: "left", size: 20 }),
		pos(mousePos()),
		anchor("left"),
		fixed(),
		color(3, 252, 73),
		opacity(),
		timer(),
	]);

	texty.tween(texty.pos.y, texty.pos.y - rand(25, 35), 0.5, (p) => texty.pos.y = p, easings.easeOutQuint)
		.onEnd(() => {
			texty.fadeOut(0.25).onEnd(() => texty.destroy());
		});

	return texty;
}

/** Interface that defins some functions in the stamps section for EditorUtils */
interface editorUtils {
	moveToDetune(move: Move): -50 | -100 | 100 | 50;

	clipboardMessage(action: "copy" | "cut" | "paste", clipboard: EditorStamp[]): string;

	/** Gets the closest stamp at a certain step
	 *
	 * If it's note it will account for trails of note [length]
	 * @param step The step to find the note at
	 */
	find(stampType: "note", step: number): EditorNote;
	find(stampType: "event", step: number): EditorEvent;

	/** The condition for being able to render something */
	renderingConditions(yPos: number, square_size?: Vec2): boolean;
}

export const editorUtils: editorUtils = {
	moveToDetune(move: Move) {
		switch (move) {
			case "left":
				return -50;
			case "down":
				return -100;
			case "up":
				return 100;
			case "right":
				return 50;
		}
	},

	clipboardMessage(action: "copy" | "cut" | "paste", clipboard: EditorStamp[]) {
		let message = "";

		const notesLength = clipboard.filter((stamp) => stamp.is("note")).length;
		const eventsLength = clipboard.filter((stamp) => stamp.is("event")).length;
		const moreThanOneNote = notesLength > 1;
		const moreThanOneEvent = eventsLength > 1;

		const stringForAction = action == "copy" ? "Copied" : action == "cut" ? "Cut" : "Pasted";

		if (notesLength > 0 && eventsLength == 0) {
			message = `${stringForAction} ${notesLength} ${moreThanOneNote ? "notes" : "note"}!`;
		}
		else if (notesLength == 0 && eventsLength > 0) {
			message = `${stringForAction} ${eventsLength} ${moreThanOneEvent ? "events" : "event"}!`;
		}
		else if (notesLength > 0 && eventsLength > 0) {
			message = `${stringForAction} ${notesLength} ${moreThanOneNote ? "notes" : "note"} and ${eventsLength} ${moreThanOneEvent ? "events" : "event"}!`;
		}
		else if (notesLength == 0 && eventsLength == 0) message = `${stringForAction} nothing!`;

		return message;
	},

	find(stampType: "note" | "event", step: number) {
		if (stampType == "note") {
			const note = StateChart.instance.notes.find((note) => note.step == step);
			if (note) return note as EditorNote;
			else {
				const longNotes = StateChart.instance.notes.filter((note) => note.data.length != undefined);
				const noteWithTrailAtStep = longNotes.find((note) => {
					if (utils.isInRange(step, note.step, note.step + note.data.length)) {
						return note;
					}
					else return undefined as EditorNote;
				});
				return noteWithTrailAtStep as EditorNote;
			}
		}
		else if (stampType == "event") {
			return StateChart.instance.events.find((event) => {
				return event.step == step;
			}) as EditorEvent;
		}
		else return undefined as any;
	},

	renderingConditions(yPos: number, square_size = StateChart.SQUARE_SIZE) {
		return utils.isInRange(yPos, -square_size.y, height() + square_size.y);
	},
};
