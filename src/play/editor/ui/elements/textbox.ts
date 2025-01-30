import { KEventController } from "kaplay";
import { ui } from "../../../../ui/objects/uiElementComp";
import { EditorTab } from "../tabs";

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

	function updateValue() {
		if (seeValue.length == 0) textbox.value = defaultValue;
		else textbox.value = seeValue;
		textbox.trigger("change");
	}

	textbox.onUpdate(() => {
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
					updateValue();
				}
			});

			onBackspace = textbox.onKeyPressRepeat("backspace", () => {
				if (seeValue.length - 1 >= 0) seeValue = textbox.value.toString().slice(0, -1);
				updateValue();
			});

			const onEnter = textbox.onKeyPress("enter", () => {
				updateValue();
				textbox.focused = false;
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
				opacity: Math.round(time()) % 1 == 0 ? 1 : 0,
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
