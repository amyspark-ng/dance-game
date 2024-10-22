import { GameObj, OpacityComp } from "kaplay"
import { playSound } from "../../core/plugins/features/sound"
import { DANCER_POS, getDancer } from "../objects/dancer"

/** Runs when the game is paused */
export function pauseGame(dancerName: string) {
	const pauseScratch = playSound("pauseScratch", { volume: 0.1, detune: 0, speed: 1 })
	pauseScratch.detune = rand(-100, 100)
	let pauseBlack = get("pauseBlack")[0]

	// not found pauseBlack
	if (!pauseBlack) {
		pauseBlack = add([
			rect(width(), height()),
			color(BLACK),
			pos(center()),
			anchor("center"),
			z(100),
			opacity(0.5),
			"pauseBlack",
		])

		pauseBlack.fadeIn(0.1)
	
		const pauseText = pauseBlack.add([
			text("PAUSED", { size: 50 }),
			pos(0, -pauseBlack.height / 2 + 50),
			anchor("center"),
			opacity(),
			{
				update() {
					this.opacity = pauseBlack.opacity * 2
				}
			}
		])

		const ogDancer = getDancer()
		tween(ogDancer.scale.x, 0, 0.1, (p) => ogDancer.scale.x = p)
		tween(ogDancer.pos.y, height() + ogDancer.height, 0.1, (p) => ogDancer.pos.y = p)
	
		// fake dancer
		const fakeDancer = add([
			sprite("dancer_" + dancerName, { anim: "idle" }),
			pos(center().x + ogDancer.width, center().y + height() / 10),
			anchor("center"),
			scale(),
			z(pauseBlack.z + 1),
		])

		pauseBlack.onDestroy(() => {
			pauseText.destroy()
			fakeDancer.destroy()
		})

		tween(fakeDancer.pos.y, height() - ogDancer.height / 2, 0.1, (p) => fakeDancer.pos.y = p)
		tween(0, 1, 0.1, (p) => fakeDancer.scale.x = p)
	}

	// was found just fade it in again
	else {
		pauseBlack.fadeIn(0.1)
	}
}

export function unpauseGame() {
	let pauseBlack = get("pauseBlack")[0] as GameObj<OpacityComp>
	
	if (pauseBlack) {
		pauseBlack.fadeOut(0.1).onEnd(() => {
			pauseBlack.destroy()
		})
	}

	const ogDancer = getDancer()
	tween(ogDancer.pos, Vec2.fromArray(DANCER_POS), 0.1, (p) => getDancer().pos = p)
	tween(ogDancer.scale, vec2(1), 0.1, (p) => getDancer().scale = p)
}