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

export function addLogText(texting: string) {
	const texty = add([
		text(texting, { align: "left", size: 20 }),
		pos(),
		color(BLACK),
		fixed(),
		anchor("left"),
		"logText",
	]);

	const logTexts = get("logText") as ReturnType<typeof addLogText>[];
	const index = logTexts.indexOf(texty);
	texty.pos = vec2(10, height() - texty.height * index - texty.height / 2);

	wait(1, () => {
		texty.destroy();
	});
	return texty;
}

/** Interface that defins some functions in the stamps section for EditorUtils */
interface editorUtils {
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

	/** Converts a step to a position (a hawk to a) */
	stepToPos(step: number): Vec2;

	/** Given an array of stamps, it will sort them in boxes and return the notes and events array */
	boxSortStamps(stamps: EditorStamp[]): { notes: EditorNote[]; events: EditorEvent[]; toString(): string; };
}

export const editorUtils: editorUtils = {
	clipboardMessage(action: "copy" | "cut" | "paste", clipboard: EditorStamp[]) {
		const stringForAction = action == "copy" ? "Copied" : action == "cut" ? "Cut" : "Pasted";
		return stringForAction + " " + StateChart.utils.boxSortStamps(clipboard).toString() + "!";
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

	boxSortStamps(stamps: EditorStamp[]) {
		const notes = stamps.filter((stamp) => stamp.is("note"));
		const events = stamps.filter((stamp) => stamp.is("event"));
		return {
			notes,
			events,
			toString() {
				return `${notes.length} ${notes.length > 1 ? "notes" : "note"} and ${events.length} ${events.length > 1 ? "events" : "event"}`;
			},
		};
	},

	renderingConditions(yPos: number, square_size = StateChart.SQUARE_SIZE) {
		return utils.isInRange(yPos, -square_size.y, height() + square_size.y);
	},

	stepToPos(step: number) {
		return utils.getPosInGrid(StateChart.INITIAL_POS, step, 0, StateChart.SQUARE_SIZE);
	},
};
