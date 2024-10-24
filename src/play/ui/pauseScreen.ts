import { GameObj, KEventController, OpacityComp } from "kaplay"
import { playSound } from "../../core/plugins/features/sound"
import { DANCER_POS, getDancer } from "../objects/dancer"
import { exitToChartEditor, exitToMenu, restartSong, StateGame } from "../playstate"
import { utils } from "../../utils"
import { PRODUCT } from "../../core/initGame"

/** Runs when the game is paused */
export function managePauseUI(pause:boolean, GameState:StateGame) {
	let currentIndex = 0
	
	const baseZ = 100
	let pauseBlack = get("pauseBlack")[0]

	function makePauseButton(buttonName: string, buttonIndex: number, buttonAction: () => void) {
		const buttonObj = make([
			text(buttonName, { size: 60 }),
			pos(-100, 100 + 100 * buttonIndex),
			anchor("left"),
			opacity(0.5),
			z(baseZ + 2),
			"pauseButton",
			{
				index: buttonIndex,
				action: buttonAction,
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

		return buttonObj;
	}

	if (pause == true) {
		const pauseScratch = playSound("pauseScratch", { volume: 0.1, detune: 0, speed: 1 })
		pauseScratch.detune = rand(-100, 100)
	
		const allButtons = [
			makePauseButton("CONTINUE", 0, () => { GameState.managePause(false) }),
			makePauseButton("RESTART", 1, () => { restartSong(GameState) }),
			makePauseButton("EXIT TO MENU", 2, () => { exitToMenu(GameState) }),
		]

		if (PRODUCT.DEBUG) {
			allButtons.push(makePauseButton("CHART EDITOR", 3, () => { exitToChartEditor(GameState) }))
		}

		// not found pauseBlack
		if (!pauseBlack) {
			
			pauseBlack = add([
				rect(width(), height()),
				color(BLACK),
				pos(center()),
				anchor("center"),
				z(baseZ),
				opacity(0.5),
				"pauseBlack",
			])

			pauseBlack.onUpdate(() => {
				if (!GameState.paused) return 
				
				// using these because key events were being little biiiiitches
				if (isKeyPressed("down")) currentIndex = utils.scrollIndex(currentIndex, 1, allButtons.length)
				else if (isKeyPressed("up")) currentIndex = utils.scrollIndex(currentIndex, -1, allButtons.length)
				else if (isKeyPressed("enter")) allButtons[currentIndex].action()
			})
	
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

			allButtons.forEach((button, index) => {
				wait(0.1 * (index + 1), () => {
					add(button)
				})
			})
		}
	}

	else if (pause == false) {
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
	}
}