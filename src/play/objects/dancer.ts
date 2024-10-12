import { Comp, GameObj, KEventController, PosComp, ScaleComp, SpriteComp } from "kaplay"
import { juice, juiceComp } from "../../plugins/graphics/juiceComponent"

type Move = "left" | "right" | "up" | "down" | "victory" | "miss" | "idle"

export interface dancerComp extends Comp {
	doMove(move: Move) : void,
	/** Kinda like in FNF background characters */
	moveBop() : void,
}

export function dancer() : dancerComp {
	let thisObj:GameObj<SpriteComp | dancerComp | juiceComp | PosComp | ScaleComp> = null
	let onAnimEndEvent:KEventController = null

	return {
		id: "dancer",
		require: [ "sprite", "juice", "pos" ],
		add() {
			thisObj = this
		},

		moveBop() {
			thisObj.stretch({ XorY: "y", startScale: thisObj.scale.y * 0.9, endScale: thisObj.scale.y })
		},

		doMove(move: Move) {
			if (move === "victory") {
				this.play("victory")
				onAnimEndEvent?.cancel()
				onAnimEndEvent = thisObj.onAnimEnd((animName) => {
					if (animName == "victory") {
						this.play("victory", { loop: true })
					}
				})
			}
			
			else {
				onAnimEndEvent?.cancel()
				this.play(move)
			}

			this.moveBop()
		},
	}
}

export function addDancer() {
	const dancerObj = add([
		sprite("astri", { anim: "idle" }),
		pos(center().x, height()),
		anchor("bot"),
		dancer(),
		scale(),
		juice(),
	])

	return dancerObj;
}

/** The type that a dancer game object would be */
export type Dancer = ReturnType<typeof addDancer>