import { GameObj, OpacityComp } from "kaplay"
import { playSound } from "../../core/plugins/features/sound"
import { DANCER_POS, getDancer } from "../objects/dancer"
import { StateGame } from "../playstate";

let pauseBlack = null;
let pauseText = null;
let pauseDancer = null;

let continueButton = null;
let restartButton = null;
let exitButton = null;

/** Runs when the game is paused */
export function managePauseUI(pause:boolean, GameState:StateGame) {
	// pausing
	if (pause == true) {
		const pauseScratch = playSound("pauseScratch", { volume: 0.1, detune: 0, speed: 1 })
		pauseScratch.detune = rand(-100, 100)
	}

	// unpausing
	else {
		
	}
	

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

	pauseText = pauseBlack.add([
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
	pauseDancer = add([
		sprite("dancer_" + GameState.params.dancer, { anim: "idle" }),
		pos(center().x + ogDancer.width, center().y + height() / 10),
		anchor("center"),
		scale(),
		z(pauseBlack.z + 1),
	])

	pauseBlack.onDestroy(() => {
		pauseText.destroy()
		pauseDancer.destroy()
	})

	tween(pauseDancer.pos.y, height() - ogDancer.height / 2, 0.1, (p) => pauseDancer.pos.y = p)
	tween(0, 1, 0.1, (p) => pauseDancer.scale.x = p)

	pauseBlack.fadeIn(0.1)
}