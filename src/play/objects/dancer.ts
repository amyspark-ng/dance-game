import { Comp, GameObj, KEventController, PosComp, ScaleComp, SpriteComp, TimerController, TweenController, Vec2 } from "kaplay"
import { juice, juiceComp } from "../../plugins/graphics/juiceComponent"
import { onBeatHit } from "../../game/events"

/** Moves available for the dancer, also handles the note type */
export type Move = "left" | "right" | "up" | "down" | "victory" | "miss" | "idle"

const TIME_FOR_IDLE = 2

export interface dancerComp extends Comp {
	doMove(move: Move) : void,
	/**
	 * Bops the dancer kinda like a FNF object
	 * @returns The tween, check juice stretch for more info
	 */
	moveBop() : TweenController,

	/** Gets the current move */
	getMove() : Move,
}

export function dancer() : dancerComp {
	let onAnimEndEvent:KEventController = null

	/** The wait for the idle, is cancelled on each doMove() */
	let waitForIdle:TimerController = wait(0)

	return {
		id: "dancerComp",
		require: [ "sprite", "juice", "pos" ],

		moveBop() {
			return this.stretch({ XorY: "y", startScale: this.scale.y * 0.9, endScale: this.scale.y })
		},

		getMove() {
			return this.getCurAnim().name as Move;
		},

		doMove(move: Move) {
			
			/* Storing this code for the results screen 
			if (move === "victory") {
				this.play("victory")
				onAnimEndEvent?.cancel()
				onAnimEndEvent = this.onAnimEnd((animName) => {
					if (animName == "victory") {
						this.play("victory", { loop: true })
					}
				})
			}
			*/
			
			onAnimEndEvent?.cancel()
			this.play(move)

			if (move != "idle") {
				this.moveBop()

				waitForIdle?.cancel()
				waitForIdle = wait(TIME_FOR_IDLE, () => {
					this.doMove("idle")
				})
			}
		},
	}
}

export function addDancer(initialScale?: Vec2) {
	const dancerObj = add([
		sprite("astri", { anim: "idle" }),
		pos(center().x, height()),
		anchor("bot"),
		dancer(),
		scale(initialScale ?? vec2(1)),
		juice(),
		"dancerObj",
	])

	return dancerObj;
}

/** The type that a dancer game object would be */
export type Dancer = ReturnType<typeof addDancer>

export function getDancer() : Dancer {
	return get("dancerObj", { recursive: true })[0] as Dancer
}
