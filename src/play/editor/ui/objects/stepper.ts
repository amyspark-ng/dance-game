import { ui } from "../../../../ui/objects/uiElementComp";
import { utils } from "../../../../utils";
import { EditorTab } from "../editorTab";

export function makeNumberStepper(defaultValue: number, increaseValue: number) {
	let theWidth = formatText({ text: "AAAAA", size: 20 }).width;

	const obj = make([
		rect(0, 0),
		pos(),
		ui(),
		{
			value: defaultValue,
		},
	]);

	function addArrow(direction: "left" | "right") {
		const arrow = obj.add([
			rect(15, 30, { radius: 2 }),
			color(EditorTab.ui.BODY.lighten(30)),
			pos(),
			outline(2, EditorTab.ui.BODY_OUTLINE),
			area(),
			z(1),
			"hover",
		]);
		let counter = 0;

		const regularColor = EditorTab.ui.BODY.lighten(30);
		const brighterColor = EditorTab.ui.BODY.lighten(50);

		function updateValue() {
			if (direction == "left" && obj.value > 1) obj.value -= increaseValue;
			else obj.value += increaseValue;

			// has decimal place
			if (Math.round(obj.value) != obj.value) obj.value = parseFloat(obj.value.toFixed(1));
			obj.trigger("change");
		}

		arrow.onUpdate(() => {
			if (isMouseDown("left") && arrow.isHovering()) {
				counter += dt();

				if (counter >= 0.1) {
					counter = 0;
					updateValue();
				}

				arrow.color = brighterColor;
			}
			else if (isMouseReleased("left") && counter > 0) {
				updateValue();
			}
			else {
				counter = 0;
				arrow.color = regularColor;
			}
		});

		arrow.onDraw(() => {
			drawSprite({
				sprite: "ui_arrow",
				pos: vec2(arrow.width / 4, arrow.height / 4),
				flipX: direction == "right" ? true : false,
			});
		});
		return arrow;
	}

	const leftArrow = addArrow("left");
	const textbox = obj.add([
		rect(theWidth, 30, { radius: 2 }),
		color(EditorTab.ui.BODY),
		outline(2, EditorTab.ui.BODY_OUTLINE),
		area(),
		pos(leftArrow.width, 0),
		z(0),
		"hover",
	]);
	const rightArrow = addArrow("right");
	rightArrow.pos.x = textbox.pos.x + textbox.width;

	textbox.onMousePress("left", () => {
		if (textbox.isHovering()) {
			obj.focused = true;
		}
		else {
			obj.focused = false;
		}
	});

	obj.onUpdate(() => {
		if (obj.focused) {
			leftArrow.outline.color = EditorTab.ui.ACCENT;
			textbox.outline.color = EditorTab.ui.ACCENT;
			rightArrow.outline.color = EditorTab.ui.ACCENT;
		}
		else {
			leftArrow.outline.color = EditorTab.ui.BODY_OUTLINE;
			textbox.outline.color = EditorTab.ui.BODY_OUTLINE;
			rightArrow.outline.color = EditorTab.ui.BODY_OUTLINE;
		}
	});

	textbox.onDraw(() => {
		drawText({
			text: Array.isArray(obj.value) ? obj.value[0] : obj.value.toString(),
			anchor: "center",
			align: "center",
			pos: vec2(textbox.width / 2, textbox.height / 2),
			size: 20,
		});
	});

	obj.height = textbox.height;
	obj.width = leftArrow.width + textbox.width + rightArrow.width;

	return obj;
}

export function makeEnumStepper(defaultValue: string, options: string[]) {
	let theWidth = formatText({ text: "AAAAA", size: 20 }).width;

	let index = options.indexOf(defaultValue);

	const obj = make([
		rect(0, 0),
		pos(),
		ui(),
		{
			value: defaultValue,
		},
	]);

	function addArrow(direction: "left" | "right") {
		const arrow = obj.add([
			rect(15, 30, { radius: 2 }),
			color(EditorTab.ui.BODY.lighten(30)),
			pos(),
			outline(2, EditorTab.ui.BODY_OUTLINE),
			area(),
			z(1),
			"hover",
		]);
		let counter = 0;

		const regularColor = EditorTab.ui.BODY.lighten(30);
		const brighterColor = EditorTab.ui.BODY.lighten(50);

		function updateValue() {
			if (direction == "left") index = utils.scrollIndex(index, 1, options.length);
			else index = utils.scrollIndex(index, -1, options.length);
			obj.value = options[index];
		}

		arrow.onUpdate(() => {
			if (isMouseDown("left") && arrow.isHovering()) {
				counter += dt();

				if (counter >= 0.1) {
					counter = 0;
					updateValue();
				}

				arrow.color = brighterColor;
			}
			else if (isMouseReleased("left") && counter > 0) {
				updateValue();
			}
			else {
				counter = 0;
				arrow.color = regularColor;
			}
		});

		arrow.onDraw(() => {
			drawSprite({
				sprite: "ui_arrow",
				pos: vec2(arrow.width / 4, arrow.height / 4),
				flipX: direction == "right" ? true : false,
			});
		});
		return arrow;
	}

	const leftArrow = addArrow("left");
	const textbox = obj.add([
		rect(theWidth, 30, { radius: 2 }),
		color(EditorTab.ui.BODY),
		outline(2, EditorTab.ui.BODY_OUTLINE),
		area(),
		pos(leftArrow.width, 0),
		z(0),
		"hover",
	]);
	const rightArrow = addArrow("right");
	rightArrow.pos.x = textbox.pos.x + textbox.width;

	textbox.onMousePress("left", () => {
		if (textbox.isHovering()) {
			obj.focused = true;
		}
		else {
			obj.focused = false;
		}
	});

	obj.onUpdate(() => {
		if (obj.focused) {
			leftArrow.outline.color = EditorTab.ui.ACCENT;
			textbox.outline.color = EditorTab.ui.ACCENT;
			rightArrow.outline.color = EditorTab.ui.ACCENT;
		}
		else {
			leftArrow.outline.color = EditorTab.ui.BODY_OUTLINE;
			textbox.outline.color = EditorTab.ui.BODY_OUTLINE;
			rightArrow.outline.color = EditorTab.ui.BODY_OUTLINE;
		}
	});

	textbox.onDraw(() => {
		drawText({
			text: Array.isArray(obj.value) ? obj.value[0] : obj.value.toString(),
			anchor: "center",
			align: "center",
			pos: vec2(textbox.width / 2, textbox.height / 2),
			size: 20,
		});
	});

	obj.width = leftArrow.width + textbox.width + rightArrow.width;

	return obj;
}
