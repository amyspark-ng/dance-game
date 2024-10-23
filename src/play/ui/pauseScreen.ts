import { GameObj, KEventController, OpacityComp } from "kaplay"
import { playSound } from "../../core/plugins/features/sound"
import { DANCER_POS, getDancer } from "../objects/dancer"
import { exitToMenu, restartSong, StateGame } from "../playstate"
import { utils } from "../../utils"

/** Runs when the game is paused */
export function managePauseUI(pause:boolean, GameState:StateGame) {
	let currentIndex = 0
	
	const baseZ = 100
	let pauseBlack = get("pauseBlack")[0]

	let downKeyEvent:KEventController = null
	let upKeyEvent:KEventController = null
	let enterKeyEvent:KEventController = null

	if (pause) {
		const pauseScratch = playSound("pauseScratch", { volume: 0.1, detune: 0, speed: 1 })
		pauseScratch.detune = rand(-100, 100)
	
		// not found pauseBlack
		if (!pauseBlack) {
			// for input in buttons and stuff
			downKeyEvent = onKeyPress("down", () => {
				if (!GameState.paused) return
				currentIndex = utils.scrollIndex(currentIndex, 1, 3)
			})
			
			upKeyEvent = onKeyPress("up", () => {
				if (!GameState.paused) return
				currentIndex = utils.scrollIndex(currentIndex, -1, 3)
			})
			
			enterKeyEvent = onKeyPress("enter", () => {
				if (!GameState.paused) return
				const button = get("pauseButton").sort((a, b) => a.index - b.index)[currentIndex]
				if (button != undefined) {
					button.action()
				}
			})
			
			pauseBlack = add([
				rect(width(), height()),
				color(BLACK),
				pos(center()),
				anchor("center"),
				z(baseZ),
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
				sprite("dancer_" + GameState.params.dancer, { anim: "idle" }),
				pos(center().x + ogDancer.width, center().y + height() / 10),
				anchor("center"),
				scale(),
				z(baseZ + 1),
			])
	
			pauseBlack.onDestroy(() => {
				pauseText.destroy()
				fakeDancer.destroy()
			})
	
			tween(fakeDancer.pos.y, height() - ogDancer.height / 2, 0.1, (p) => fakeDancer.pos.y = p)
			tween(0, 1, 0.1, (p) => fakeDancer.scale.x = p)

			class button {
				name: string;
				action: () => void;
				constructor(name:string, action: () => void) {
					this.name = name
					this.action = action
				}
			}

			const allButtons = [
				new button("CONTINUE", () => {
					GameState.managePause(false)
				}),
				new button("RESTART", () => {
					restartSong(GameState)
				}),
				new button("EXIT TO MENU", () => {
					exitToMenu(GameState)
				})
			]

			allButtons.forEach((button, index) => {
				wait(0.1 * (index + 1), () => {
					const buttonObj = add([
						text(button.name, { size: 60 }),
						pos(-100, 100 + 100 * index),
						anchor("left"),
						opacity(0.5),
						z(baseZ + 2),
						"pauseButton",
						{
							index: index,
							action: allButtons[index].action,
							update() {
								if (currentIndex == this.index) this.opacity = 1
								else this.opacity = 0.5
							}
						}
					])

					const Xpos = 50
					tween(buttonObj.pos.x, Xpos, 0.25, (p) => buttonObj.pos.x = p, easings.easeOutQuint).onEnd(() => {
						buttonObj.onUpdate(() => {
							if (currentIndex == buttonObj.index) {
								buttonObj.pos.x = lerp(buttonObj.pos.x, Xpos + 15, 0.5)
							}
							
							else {
								buttonObj.pos.x = lerp(buttonObj.pos.x, Xpos, 0.5)
							}
						})
					})
				})
			})
		}
	}

	else {
		let pauseBlack = get("pauseBlack")[0] as GameObj<OpacityComp>
		
		if (pauseBlack) {
			pauseBlack.fadeOut(0.1).onEnd(() => {
				pauseBlack.destroy()
			})
		}

		get("pauseButton").forEach((button) => {
			tween(button.pos.x, -100, 0.1, (p) => button.pos.x = p, easings.easeOutQuint).onEnd(() => {
				button.destroy()
			})
		})
		
		const ogDancer = getDancer()
		tween(ogDancer.pos, Vec2.fromArray(DANCER_POS), 0.1, (p) => getDancer().pos = p)
		tween(ogDancer.scale, vec2(1), 0.1, (p) => getDancer().scale = p)
	
		upKeyEvent?.cancel()
		downKeyEvent?.cancel()
		enterKeyEvent?.cancel()
	}
}