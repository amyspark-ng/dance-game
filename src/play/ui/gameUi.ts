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
		z(1),
		{
			time: 0,
			update() {
				this.text = `${utils.formatTime(this.time)}`
			}
		}
	])

	const missesText = add([
		text("", { size: size, align: "left" }),
		pos(padding, height() - size * 2 - padding),
		anchor("left"),
		z(1),
		{
			misses: 0,
			update() {
				this.text = `X | ${this.misses}`
			}
		}
	])

	const healthText = add([
		text("", { size: size, align: "left" }),
		pos(padding, size),
		anchor("left"),
		z(1),
		{
			health: 0,
			update() {
				this.text = Math.round(this.health).toString()
			}
		}
	])

	const scoreText = add([
		text("", { size: size, align: "right" }),
		pos(width(), size),
		anchor("right"),
		z(1),
		{
			score: 0,
			update() {
				this.score = Math.round(this.score)
				this.text = utils.formatNumber(this.score, { type: "simple" }) + utils.star
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
		z(1),
		{
			value: 0,
			update() {
				this.opacity -= dt()
				if (this.value >= 0) {
					this.text = "+" + utils.formatNumber(Math.abs(this.value), { type: "simple" })
				}
				
				else {
					this.text = "-" + utils.formatNumber(Math.abs(this.value), { type: "simple" })
				}
			}
		}
	])

	return { timeText, missesText, healthText, scoreText, scoreDiffText }
}