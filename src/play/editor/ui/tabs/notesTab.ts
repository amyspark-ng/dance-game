import { getNoteskinSprite } from "../../../../data/noteskins";
import { Move } from "../../../objects/dancer";
import { EditorState } from "../../EditorState";
import { EditorTab } from "../tabs";
import addTab from "./baseTab";

export function notesTab() {
	const tab = addTab(EditorTab.tabs.Notes);

	const moves: Move[] = ["left", "down", "up", "right"];
	const notes = tab.add(["ui", pos(), { height: 0, width: 0 }]);

	moves.forEach((move, index) => {
		const note = notes.add([
			sprite(getNoteskinSprite(move)),
			pos((index % 4) * 60, Math.floor(index / 4) * 60),
			area(),
			opacity(),
			scale(),
			"hover",
			"ui",
		]);

		note.onClick(() => {
			EditorState.instance.currentMove = move;
		});

		note.onUpdate(() => {
			note.opacity = lerp(note.opacity, note.isHovering() ? 0.8 : 0.5, 0.5);
		});
	});

	notes.width = 60 * 4;
	notes.height = 60;
	tab.updateLayout({ top: 5, bottom: 5, left: 5, right: 5 });
	return tab;
}
