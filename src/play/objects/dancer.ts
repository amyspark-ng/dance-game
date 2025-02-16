import { KEventController, TweenController, Vec2 } from "kaplay";
import { GameSave } from "../../core/save";
import { Dancer, getCurDancer } from "../../data/dancer";

export const moveAnimsArr = ["left", "down", "up", "right"] as const;
/** The moves in the gameplay, also handles the note type */
export type Move = typeof moveAnimsArr[number];

/** The moves the dancer can make */
export type DancerAnim = Move | "idle" | "miss";

/** Time it'll take for the dancer to go back to idleing */
const TIME_FOR_IDLE = 1;

export const DANCER_POS = vec2(518, 377);

/** Make a base dancer object
 * @param dancerID the ID of the dancer
 */
export function makeDancer(intendedScale: Vec2 = vec2(1)) {
	let onAnimEndEvent: KEventController = null;

	const dancer = getCurDancer();

	const dancerObj = make([
		sprite(dancer.spriteName),
		pos(center().x, height()),
		anchor("bot"),
		scale(intendedScale),
		z(2),
		rotate(),
		"dancer",
		{
			/** The data of the dancer */
			data: dancer,
			/** The timer controller for the wait for the idle */
			waitForIdle: null as KEventController,
			forcedAnim: false,
			currentMove: "idle" as DancerAnim,
			add() {
				this.waitForIdle = wait(0);
			},

			doMove(move: DancerAnim, miss?: true): void {
			},

			/**
			 * Bops the dancer kinda like a FNF object
			 * @returns The tween
			 */
			bop(duration: number = 0.25): TweenController {
				this.scale.x = intendedScale.x;
				return tween(intendedScale.y * 0.9, intendedScale.y, duration, (p) => this.scale.y = p);
			},
		},
	]);

	dancerObj.bop = (duration: number = 0.25) => {
		if (!dancerObj.data.manifest.bop_on_beat) return;
		dancerObj.scale.x = intendedScale.x;
		return tween(intendedScale.y * 0.9, intendedScale.y, duration, (p) => dancerObj.scale.y = p);
	};

	dancerObj.doMove = (move: DancerAnim, miss: boolean = false, doBop: boolean = dancerObj.data.manifest.bop_on_beat) => {
		if (dancerObj.forcedAnim) return;

		dancerObj.currentMove = move;
		onAnimEndEvent?.cancel();
		const anim = dancerObj.data.getAnim(move, miss);
		dancerObj.play(anim);
		// probably playing notes or something
		if (move != "idle" && move != "miss") {
			dancerObj.bop();

			dancerObj.waitForIdle?.cancel();
			dancerObj.waitForIdle = wait(TIME_FOR_IDLE, () => {
				const keyForMove = GameSave.getKeyForMove(move);

				if (!isKeyDown(keyForMove)) {
					dancerObj.doMove("idle");
				}
				else {
					let checkforkeyrelease = onKeyRelease(() => {
						checkforkeyrelease.cancel();
						dancerObj.doMove("idle");
					});
				}
			});
		}
	};

	dancerObj.doMove("idle");
	dancerObj.pos = DANCER_POS;
	return dancerObj;
}

/** The type that a dancer game object would be */
export type DancerGameObj = ReturnType<typeof makeDancer>;
