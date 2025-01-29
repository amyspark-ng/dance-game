import { ui } from "../../../../ui/objects/uiElementComp";
import { EditorTab } from "../editorTab";

export default function makeCheckbox(defaultValue: boolean) {
	const checkbox = make([
		rect(28, 28, { radius: 3 }),
		area(),
		pos(),
		color(EditorTab.ui.BODY),
		outline(2, EditorTab.ui.BODY_OUTLINE),
		ui(),
		"hover",
		{
			value: defaultValue,
		},
	]);

	checkbox.onMousePress(() => {
		if (checkbox.isHovering()) {
			checkbox.focused = true;
			checkbox.value = !checkbox.value;
		}
		else {
			checkbox.focused = false;
		}
	});

	checkbox.onUpdate(() => {
		if (checkbox.focused) checkbox.outline.color = EditorTab.ui.ACCENT;
		else checkbox.outline.color = EditorTab.ui.BODY_OUTLINE;
	});

	checkbox.onDraw(() => {
		if (checkbox.value == true) {
			drawRect({
				anchor: "center",
				pos: vec2(checkbox.width / 2, checkbox.height / 2),
				width: checkbox.width,
				height: checkbox.height,
				radius: 3,
				scale: vec2(0.65),
			});
		}
	});

	return checkbox;
}
