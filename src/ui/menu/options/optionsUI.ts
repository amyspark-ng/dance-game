
function optionItem() {
	return {
		/** The position they have on the list */
		id: "optionItem",
		index: undefined,
	}
}

export const tagForSlider = "slider"

export function addVolumeSlider() {
	const rectangle = add([
		rect(300, 50),
		pos(),
		anchor("left"),
		optionItem(),
		color(),
		tagForSlider,
	])

	return rectangle;
}

export const tagForCheckbox = "checkbox"

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
				this.selected = !this.selected
				this.trigger("check", this.selected)
			},

			onCheck(action: (checked:boolean) => void) {
				return this.on("check", action)
			},
		}
	])

	const texty = add([
		text(title, { align: "left" }),
		pos(),
		anchor("left"),
		opacity(),
	])

	texty.onUpdate(() => {
		texty.pos.x = checkbox.pos.x + checkbox.width * 1.1
		texty.pos.y = checkbox.pos.y
		texty.opacity = checkbox.opacity

		checkbox.tags.forEach((tag) => {
			if (!texty.is(tag)) texty.use(tag)
		})
	})

	return checkbox;
}