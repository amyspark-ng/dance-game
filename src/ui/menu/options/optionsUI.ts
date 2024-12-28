import { utils } from "../../../utils";

function optionItem() {
	return {
		/** The position they have on the list */
		id: "optionItem",
		index: undefined,
	};
}

export const tagForSlider = "slider";
export function addVolumeSlider(title: string) {
	const rectangle = add([
		rect(300, 50),
		pos(),
		anchor("left"),
		optionItem(),
		color(),
		opacity(),
		tagForSlider,
		title,
		{
			value: 0,
		},
	]);

	const titleText = rectangle.add([
		text(title, { align: "center" }),
		pos(),
		anchor("center"),
		opacity(),
		"title",
		{
			update() {
				this.pos.x = rectangle.width / 2;
				this.opacity = rectangle.opacity;
			},
		},
	]);

	const valueText = rectangle.add([
		text("", { align: "left" }),
		pos(),
		anchor("right"),
		opacity(),
		"value",
	]);

	valueText.onUpdate(() => {
		rectangle.value = utils.fixDecimal(rectangle.value);
		valueText.text = utils.formatNumber(rectangle.value, { type: "decimal" });
		valueText.pos.x = rectangle.width + valueText.width * 1.1;
		valueText.opacity = rectangle.opacity;
	});

	return rectangle;
}

export const tagForCheckbox = "checkbox";

export function addCheckbox(title: string) {
	const checkbox = add([
		rect(50, 50),
		pos(),
		anchor("center"),
		color(),
		optionItem(),
		opacity(),
		tagForCheckbox,
		{
			selected: false,
			check() {
				this.selected = !this.selected;
				this.trigger("check", this.selected);
			},

			onCheck(action: (checked: boolean) => void) {
				return this.on("check", action);
			},
		},
	]);

	const texty = add([
		text(title, { align: "left" }),
		pos(),
		anchor("left"),
		opacity(),
	]);

	texty.onUpdate(() => {
		texty.pos.x = checkbox.pos.x + checkbox.width * 1.1;
		texty.pos.y = checkbox.pos.y;
		texty.opacity = checkbox.opacity;

		checkbox.tags.forEach((tag) => {
			if (!texty.is(tag)) texty.use(tag);
		});
	});

	return checkbox;
}

export const tagForNumItem = "numItem";
export function addNumberItem(title: string) {
	const height = 50;

	const item = add([
		text("0", { size: height }),
		pos(),
		anchor("center"),
		optionItem(),
		opacity(),
		tagForNumItem,
		{
			value: 0,
			update() {
				this.text = this.value.toFixed(1);
			},
		},
	]);

	item.height = height;

	const texty = add([
		text(title, { align: "left" }),
		pos(),
		anchor("left"),
		opacity(),
	]);

	texty.onUpdate(() => {
		texty.pos.x = item.pos.x + item.width * 1.1;
		texty.pos.y = item.pos.y;
		texty.opacity = item.opacity;

		item.tags.forEach((tag) => {
			if (!texty.is(tag)) texty.use(tag);
		});
	});

	return item;
}
