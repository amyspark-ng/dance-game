import { Comp, GameObj, KEventController, Key } from "kaplay";
import { getNoteskinSprite, NoteskinContent, NoteskinData } from "../../../data/noteskins";
import { Move } from "../../../play/objects/dancer";
import { utils } from "../../../utils";

export interface optionsCheckboxComp extends Comp {
	value: boolean;
	check(): void;
}

export function addOptionsCheckbox(onCheck: (checked: boolean) => void, initialValue: boolean) {
	function optionsCheckbox(): optionsCheckboxComp {
		return {
			value: initialValue,
			check() {
			},
		};
	}

	const checkbox = add([
		rect(70, 70),
		optionsCheckbox(),
		anchor("left"),
		pos(),
		color(),
		"checkbox",
		{
			handleInput: () => {},
		},
	]);

	checkbox.handleInput = () => {
		if (isKeyPressed("enter")) checkbox.check();
	};

	checkbox.onUpdate(() => {
		if (checkbox.value) checkbox.color = BLACK;
		else checkbox.color = WHITE;
	});

	checkbox.check = () => {
		checkbox.value = !checkbox.value;
		onCheck(checkbox.value);
	};

	return checkbox;
}

export interface optionsStepperComp extends Comp {
	value: number;
	change(change: -1 | 1): void;
	onChange(action: () => void): void;
}

export function addOptionsStepper(step: number, min: number, max: number, onChange: (value: number) => void, initialValue: number) {
	function optionsStepper(): optionsStepperComp {
		return {
			value: initialValue,
			onChange(action) {
			},
			change(change) {
			},
		};
	}

	const number = add([
		text(initialValue.toString(), { size: 60 }),
		optionsStepper(),
		color(BLACK),
		anchor("left"),
		pos(),
		"stepper",
		{
			handleInput: () => {},
		},
	]);

	number.handleInput = () => {
		if (isKeyPressed("left")) number.change(-1);
		else if (isKeyPressed("right")) number.change(1);
	};

	number.change = (change) => {
		number.value += step * change;
		number.value = parseFloat(number.value.toFixed(utils.countDecimals(step)));
		number.value = clamp(number.value, min, max);
		number.text = number.value.toString();
		onChange(number.value);
	};

	return number;
}

export function addOptionsNoteskinEnum(noteskin: NoteskinContent, options: NoteskinContent[], onChange: (name: string) => void) {
	const container = add([
		area(),
		rect(0, 0, { fill: false }),
		color(BLACK),
		anchor("left"),
		pos(),
		"stepper",
		{
			change(change: -1 | 1) {
			},
			handleInput: () => {
			},
		},
	]);

	container.handleInput = () => {
		if (isKeyPressed("left")) container.change(-1);
		else if (isKeyPressed("right")) container.change(1);
	};

	let index = options.indexOf(noteskin);

	container.change = (change: -1 | 1) => {
		index = utils.scrollIndex(index, change, options.length);
		const name = options[index].name;
		container.get("note").forEach((note) => note.sprite = options[index].getSprite(note.gameMove));
		onChange(name);
	};

	const moves = ["left", "down", "up", "right"] as Move[];

	moves.forEach((move, index) => {
		const child = container.add([
			sprite(noteskin.getSprite(move)),
			pos(0, 0),
			scale(1),
			anchor("left"),
			"note",
			{
				gameMove: move,
			},
		]);

		child.pos.x = child.width * index;
		container.width += child.width * child.scale.x;
		container.height = child.height * child.scale.y;
	});

	return container;
}

export function addOptionsButton(label: string, action: () => void) {
	const labelObj = add([
		text(label, { align: "left", size: 60 }),
		anchor("left"),
		pos(0, 0),
		{
			action: action,
			handleInput: () => {},
		},
	]);

	labelObj.handleInput = () => {
		if (isKeyPressed("enter")) action();
	};

	return labelObj;
}

export function addOptionsKeyInput(onChange: (key: Key) => void, onFocusChange: (focused: boolean) => void, initialValue: string) {
	function parseKey(key: Key): string {
		let string: string = "";
		if (key == "left") string = "←";
		else if (key == "down") string = "↓";
		else if (key == "up") string = "↑";
		else if (key == "right") string = "→";
		else string = key.toUpperCase();
		return string;
	}

	const square = add([
		rect(60, 60),
		anchor("left"),
		color(BLACK),
		pos(0, 0),
		{
			key: parseKey(initialValue),
			handleInput: () => {},
		},
	]);

	square.onDraw(() => {
		drawText({
			text: square.key,
			size: square.height * 0.75,
			anchor: "left",
		});
	});

	let inputEV: KEventController = null;
	square.handleInput = () => {
		if (isKeyPressed("enter")) {
			onFocusChange(true);
			inputEV?.cancel();
			inputEV = onCharInput((ch) => {
				square.key = parseKey(ch);

				inputEV.cancel();
				inputEV = null;
				onChange(ch);
				onFocusChange(false);
			});
		}
		else if (isKeyPressed("escape") && inputEV != null) {
			inputEV?.cancel();
			onFocusChange(false);
		}
	};

	return square;
}

export function addOptionsMoveInput(move: Move, ...args: Parameters<typeof addOptionsKeyInput>) {
	const keyInput = addOptionsKeyInput(...args);
	const note = keyInput.add([
		sprite(getNoteskinSprite(move)),
		anchor("left"),
		pos(),
	]);
	keyInput.width += note.width;
	note.pos.x += note.width;

	return keyInput;
}
