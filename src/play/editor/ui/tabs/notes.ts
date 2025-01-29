import { getNoteskinSprite } from "../../../../data/noteskins";
import { Move } from "../../../objects/dancer";
import { StateChart } from "../../EditorState";
import { EditorTab } from "../tabs";

export function defineNotesTab() {
	EditorTab.tabs.Notes.addElements((editorTabObj) => {
		editorTabObj.width = 240;
		editorTabObj.height = 65;

		const moves: Move[] = ["left", "down", "up", "right"];
		moves.forEach((move, index) => {
			const noteObj = editorTabObj.add([
				sprite(getNoteskinSprite(move)),
				pos(),
				area(),
				opacity(),
				scale(),
				anchor("center"),
				"hover",
			]);

			noteObj.width = 60;
			noteObj.height = 60;
			noteObj.pos.x = (editorTabObj.getTopLeft().x + index * 60) + noteObj.width / 2;
			noteObj.pos.y = (editorTabObj.getTopLeft().y) + noteObj.height / 2;

			noteObj.onClick(() => {
				StateChart.instance.currentMove = move;
				noteObj.scale = vec2(1.6);
			});

			noteObj.onUpdate(() => {
				noteObj.scale = lerp(noteObj.scale, StateChart.instance.currentMove == move ? vec2(1.2) : vec2(1), 0.6);
				noteObj.opacity = lerp(noteObj.opacity, noteObj.isHovering() ? 0.8 : 0.5, 0.5);
			});
		});
	});
}
