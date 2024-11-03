import { Comp, KEventController, TimerController, TweenController, Vec2 } from "kaplay"
import { juice } from "../../core/plugins/graphics/juiceComponent"
import { GameSave } from "../../core/gamesave"

/** Moves available for the dancer, also handles the note type */
export type Move = "left" | "right" | "up" | "down" | "idle"

/** Time it'll take for the dancer to go back to idleing */
const TIME_FOR_IDLE = 1

export const DANCER_POS = [518, 377]
export function addDancer(dancerName: string) {
	let onAnimEndEvent:KEventController = null
	
	const dancerObj = add([
		sprite(`dancer_${dancerName}`, { anim: "idle" }),
		pos(center().x, height()),
		anchor("bot"),
		scale(),
		juice(),
		"dancerObj",
		{
			/** The timer controller for the wait for the idle */
			waitForIdle: null,
			add() {
				this.waitForIdle = wait(0)
			},

			doMove(move: Move) : void {
				onAnimEndEvent?.cancel()
				this.play(move)
	
				if (move != "idle") {
					this.moveBop()
		
					this.waitForIdle?.cancel()
					this.waitForIdle = wait(TIME_FOR_IDLE, () => {
						const keyForMove = Object.values(GameSave.preferences.gameControls).find((gameKey) => gameKey.move == move).kbKey
						if (!isKeyDown(keyForMove)) {
							this.doMove("idle")
						}
						
						else {
							let checkforkeyrelease = onKeyRelease(() => {
								checkforkeyrelease.cancel()
								this.doMove("idle")
							})
						}
					})
				}
			},

			/**
			 * Bops the dancer kinda like a FNF object
			 * @returns The tween, check juice stretch for more info
			 */
			moveBop(theScale:Vec2 = vec2(1, 1)) : TweenController {
				return this.stretch({
					XorY: "y",
					startScale: theScale.y * 0.9,
					endScale: theScale.y,
					theTime: 0.25,
				})
			},
		
			/** Gets the current move */
			getMove() : Move {
				return this.getCurAnim().name;
			},
		
			/** miss */
			miss() : void {
				this.play("miss");
				this.moveBop();
		
				this.waitForIdle?.cancel();
				this.waitForIdle = null;
				this.waitForIdle = wait(TIME_FOR_IDLE, () => {
					this.doMove("idle");
				})
			}
		}
	])

	return dancerObj;
}

/** The type that a dancer game object would be */
export type DancerGameObj = ReturnType<typeof addDancer>

/** Gets the current dancer */
export function getDancer() : DancerGameObj {
	return get("dancerObj", { recursive: true })[0] as DancerGameObj
}

/** Class that holds some info related to a dancer */
export class DancerFile {
	dancerName: string;
	dancerBg: string;
}