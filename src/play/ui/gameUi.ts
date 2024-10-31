import { juice } from "../../core/plugins/graphics/juiceComponent"
import { utils } from "../../utils"

/** Adds some of the ui and interface in the game scene */
export function addUI() {
	const size = 30
	const padding = 5
	
	const timeText = add([
		text("", { size: size, align: "left" }),
		pos(padding, height() - size),
		anchor("left"),
	])

	const missesText = add([
		text("", { size: size, align: "left" }),
		pos(padding, height() - size * 2 - padding),
		anchor("left"),
	])

	const healthText = add([
		text("", { size: size, align: "left" }),
		pos(padding, size),
		anchor("left"),
		{
			value: 0,
			update() {
				this.text = Math.round(this.value).toString()
			}
		}
	])

	const scoreText = add([
		text("", { size: size, align: "right" }),
		pos(width(), size),
		anchor("right"),
		{
			value: 0,
			update() {
				this.value = Math.round(this.value)
				this.text = utils.formatNumber(this.value, { type: "simple" }) + utils.star
			}
		}
	])

	const scoreDiffText = add([
		text("", { size: size, align: "right" }),
		pos(width(), scoreText.pos.y + size + padding),
		opacity(0),
		juice(),
		scale(),
		timer(),
		anchor("right"),
		{
			value: 0,
			update() {
				this.opacity -= dt()
				
				let t = this.value > 0 ? "+" : "-"
				this.value = Math.abs(this.value)
				this.text = t + utils.formatNumber(this.value, { type: "simple" })
			}
		}
	])

	return { timeText, missesText, healthText, scoreText, scoreDiffText }
}