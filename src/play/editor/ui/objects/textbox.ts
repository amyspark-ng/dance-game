import { KEventController } from "kaplay";
import { ui } from "../../../../ui/objects/uiElementComp";
import { EditorTab } from "../editorTab";

export default function makeTextbox(defaultValue: string, textCondition?: (ch: string) => boolean) {
	if (!textCondition) {
		textCondition = (ch: string) => true;
	}

	const maxWidth = formatText({ text: "Hello world!!", size: 20 }).width + 5;
	const textbox = make([
		rect(maxWidth, 30, { radius: 2 }),
		pos(),
		color(EditorTab.ui.BODY),
		outline(2, EditorTab.ui.BODY_OUTLINE),
		area(),
		ui(),
		"hover",
		"textbox",
		{
			value: defaultValue,
		},
	]);

	let seeValue = defaultValue;
	let onCharInputEV: KEventController = null;
	let onBackspace: KEventController = null;

	textbox.onUpdate(() => {
		if (seeValue.length == 0) {
			seeValue = "";
			textbox.value = defaultValue;
		}
		else {
			textbox.value = seeValue;
			seeValue = textbox.value;
		}
		if (textbox.focused) textbox.outline.color = EditorTab.ui.ACCENT;
		else textbox.outline.color = EditorTab.ui.BODY_OUTLINE;
	});

	textbox.onMousePress(() => {
		if (textbox.isHovering()) {
			textbox.focused = true;
			onCharInputEV = textbox.onCharInput((ch) => {
				if (textCondition(ch)) {
					if (isKeyDown("shift")) ch = ch.toLocaleUpperCase();
					seeValue += ch;
					textbox.trigger("change");
				}
			});

			onBackspace = textbox.onKeyPressRepeat("backspace", () => {
				if (seeValue.length - 1 >= 0) seeValue = textbox.value.toString().slice(0, -1);
				textbox.trigger("change");
			});

			const onEnter = textbox.onKeyPress("enter", () => {
				textbox.focused = false;
				if (seeValue.length == 0) seeValue = defaultValue;
				onCharInputEV?.cancel();
				onBackspace?.cancel();
				onEnter.cancel();
			});
		}
		else {
			textbox.focused = false;
			onCharInputEV?.cancel();
			onBackspace?.cancel();
		}
	});

	textbox.onDraw(() => {
		// cursor
		if (textbox.focused) {
			drawRect({
				width: 1,
				height: 18,
				color: WHITE,
				opacity: Math.round(time()) % 2 == 0 ? 1 : 0,
				pos: vec2(formatText({ text: seeValue, size: 20 }).width + 7, 7),
			});
		}

		drawText({
			text: seeValue,
			align: "left",
			size: 20,
			pos: vec2(5, 5),
		});
	});

	return textbox;
}
