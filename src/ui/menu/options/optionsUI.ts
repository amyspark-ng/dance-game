export function makeVolumeSlider() {
	const volumeCursor = make([
		rect(10, 50),
		color(BLUE.lighten(50)),
		pos(),
		{
			index: 0
		}
	])
	
	const rectangle = make([
		rect(100, 10),
		pos(),
		anchor("center"),
	])

	return {
		cursor: volumeCursor,
		rect: rectangle
	}
}

export function makeCheckbox() {
	const checkbox = make([
		rect(50, 50),
		pos(),
		anchor("center"),
		color(),
		opacity(),
		"checkbox",
		{
			index: 0,
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

	return checkbox;
}