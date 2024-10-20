import { Comp, KEventController ,TimerController, TweenController, Vec2 } from "kaplay"
import { juice } from "../../plugins/graphics/juiceComponent"

/** Moves available for the dancer, also handles the note type */
export type Move = "left" | "right" | "up" | "down" | "idle"

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

	/** miss */
	miss(): void,

	/** The timer controller for the wait for the idle */
	waitForIdle: TimerController,
}

export function dancer() : dancerComp {
	let onAnimEndEvent:KEventController = null

	return {
		id: "dancerComp",
		require: [ "sprite", "juice", "pos", "health" ],
		waitForIdle: null,

		add() {
			this.waitForIdle = wait(0)
		},

		moveBop(theScale = vec2(0.5)) {
			return this.stretch({ XorY: "y", startScale: theScale.y * 0.9, endScale: theScale.y })
		},

		getMove() {
			return this.getCurAnim().name as Move;
		},

		doMove(move: Move) {
			onAnimEndEvent?.cancel()
			this.play(move)

			if (move != "idle") {
				this.moveBop()
	
				this.waitForIdle?.cancel()
				this.waitForIdle = wait(TIME_FOR_IDLE, () => {
					this.doMove("idle")
				})

				this.health += 5
			}
		},

		miss() {
			this.play("miss");
			this.moveBop();
	
			this.hurt(5);
			debug.log("missed")

			this.waitForIdle?.cancel();
			this.waitForIdle = null;
			this.waitForIdle = wait(TIME_FOR_IDLE, () => {
				this.doMove("idle");
			})
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
		health(100, 100),
		"dancerObj",
	])

	return dancerObj;
}

/** The type that a dancer game object would be */
export type DancerGameObj = ReturnType<typeof addDancer>

export function getDancer() : DancerGameObj {
	return get("dancerObj", { recursive: true })[0] as DancerGameObj
}
