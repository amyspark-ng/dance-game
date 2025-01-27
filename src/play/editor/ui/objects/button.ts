import { ui } from "../../../../ui/objects/uiElementComp";
import { EditorTab } from "../editorTab";

export default function makeButton(text: string, action: () => void) {
	const button = make([
		rect(30, 30, { radius: 2 }),
		pos(),
		area(),
		ui(),
		color(EditorTab.BODY_COLOR.lighten(50)),
		outline(2, EditorTab.ui.BODY_OUTLINE),
		"hover",
		{
			value: text,
		},
	]);

	const regularColor = EditorTab.ui.BODY.lighten(30);
	const brighterColor = EditorTab.ui.BODY.lighten(50);

	const drawEv = onDraw(() => {
		drawText({
			pos: vec2(button.screenPos().add(button.width / 2, button.height / 2)),
			text: button.value,
			size: 20,
			anchor: "center",
			align: "left",
		});
	});

	button.onDestroy(() => drawEv.cancel());

	button.onUpdate(async () => {
		if (isMouseReleased("left") && button.isHovering()) {
			action();
		}

		if (isMouseDown("left") && button.isHovering()) button.color = brighterColor;
		else button.color = regularColor;

		button.width = formatText({
			text: button.value + "AA",
			size: 20,
		}).width;
	});

	return button;
}
