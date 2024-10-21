import { GameStateClass } from "../gamescene";

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
	])

	const scoreText = add([
		text("", { size: size, align: "right" }),
		pos(width(), size),
		anchor("right"),
	])

	return { timeText, missesText, healthText, scoreText }
}