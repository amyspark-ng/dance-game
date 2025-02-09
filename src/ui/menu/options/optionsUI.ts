import { Comp, GameObj } from "kaplay";
import { NoteskinContent, NoteskinData } from "../../../data/noteskins";
import { Move } from "../../../play/objects/dancer";
import { utils } from "../../../utils";

export interface optionsUIComp extends Comp {
	focused: boolean;
	index: number;
}

function optionsUI(): optionsUIComp {
	return {
		id: "optionsUI",
		focused: false,
		index: 0,
	};
}

export interface optionsCheckboxComp extends optionsUIComp {
	value: boolean;
	check(): void;
	onCheck: (action: (checked: boolean) => void) => void;
}

export function addOptionsCheckbox(label: string, description: string, onCheck: (checked: boolean) => void, initialValue: boolean) {
	function optionsCheckbox(): optionsCheckboxComp {
		return {
			...optionsUI(),
			value: initialValue,
			onCheck(action) {
				return this.on("check", action);
			},
			check() {
			},
		};
	}

	const checkbox = add([
		rect(70, 70),
		optionsCheckbox(),
		anchor("center"),
		pos(),
		color(),
		"checkbox",
		{
			type: "boolean",
		},
	]);

	checkbox.onUpdate(() => {
		if (checkbox.value) checkbox.color = BLACK;
		else checkbox.color = WHITE;
	});

	checkbox.check = () => {
		checkbox.value = !checkbox.value;
		onCheck(checkbox.value);
	};

	const labelObj = checkbox.add([
		text(label, { align: "center", size: checkbox.height / 1.5 }),
		anchor("left"),
		pos(checkbox.width, 0),
	]);

	return checkbox;
}

export interface optionsStepperComp extends optionsUIComp {
	value: number;
	change(change: -1 | 1): void;
	onChange(action: () => void): void;
}

export function addOptionsStepper(label: string, description: string, step: number, min: number, max: number, onChange: (value: number) => void, initialValue: number) {
	function optionsStepper(): optionsStepperComp {
		return {
			...optionsUI(),
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
		anchor("center"),
		pos(),
		"stepper",
	]);

	number.change = (change) => {
		number.value += step * change;
		number.value = clamp(number.value, min, max);
		number.text = number.value.toString();
		onChange(number.value);
	};

	const labelObj = number.add([
		text(label, { align: "center", size: number.height / 1.5 }),
		anchor("left"),
		pos(number.width, 0),
	]);

	return number;
}

export function addOptionsNoteskinEnum(noteskin: NoteskinContent, options: NoteskinContent[], onChange: (name: string) => void) {
	const container = add([
		optionsUI(),
		color(BLACK),
		anchor("center"),
		pos(),
		"stepper",
		{
			height: 0,
			width: 0,
			change(change: -1 | 1) {
			},
		},
	]);

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
			scale(0.5),
			"note",
			{
				gameMove: move,
			},
		]);

		child.pos.x = child.width * index;
		container.width += child.width * 0.5;
		container.height = child.height * 0.5;
	});

	const labelObj = container.add([
		text("Noteskin", { align: "center", size: container.children[0].height / 1.5 }),
		anchor("left"),
		pos(0, 0),
	]);

	return container;
}
