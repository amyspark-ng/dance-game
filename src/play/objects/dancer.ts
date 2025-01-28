import { KEventController, TweenController, Vec2 } from "kaplay";
import { GameSave } from "../../core/save";
import { getDancer, getDancerByName } from "../../data/dancer";

export const moveAnimsArr = ["left", "down", "up", "right"] as const;
/** The moves in the gameplay, also handles the note type */
export type Move = typeof moveAnimsArr[number];

/** The moves the dancer can make */
export type DancerAnim = Move | "idle";

/** Time it'll take for the dancer to go back to idleing */
const TIME_FOR_IDLE = 1;

export const DANCER_POS = vec2(518, 377);

/** Make a base dancer object
 * @param dancerName the name of the dancer
 */
export function makeDancer(dancerName: string = getDancer().manifest.name, intendedScale: Vec2 = vec2(1)) {
	let onAnimEndEvent: KEventController = null;

	const dancerObj = make([
		sprite(getDancerByName(dancerName).spriteName),
		pos(center().x, height()),
		anchor("bot"),
		scale(intendedScale),
		z(2),
		rotate(),
		"dancer",
		{
			/** The data of the dancer */
			data: getDancerByName(dancerName),
			/** The timer controller for the wait for the idle */
			waitForIdle: null as KEventController,
			forcedAnim: false,
			currentMove: "idle" as DancerAnim,
			add() {
				this.waitForIdle = wait(0);
			},

			doMove(move: DancerAnim): void {
				if (this.forcedAnim) return;

				this.currentMove = move;
				onAnimEndEvent?.cancel();
				this.play(this.data.getAnim(move));

				// probably playing notes or something
				if (move != "idle") {
					this.moveBop();

					this.waitForIdle?.cancel();
					this.waitForIdle = wait(TIME_FOR_IDLE, () => {
						const keyForMove = GameSave.getKeyForMove(move);

						if (!isKeyDown(keyForMove)) {
							this.doMove("idle");
						}
						else {
							let checkforkeyrelease = onKeyRelease(() => {
								checkforkeyrelease.cancel();
								this.doMove("idle");
							});
						}
					});
				}
			},

			/**
			 * Bops the dancer kinda like a FNF object
			 * @returns The tween
			 */
			moveBop(duration: number = 0.25): TweenController {
				this.scale.x = intendedScale.x;
				return tween(intendedScale.y * 0.9, intendedScale.y, duration, (p) => this.scale.y = p);
			},

			/** miss */
			miss(): void {
				if (this.forcedAnim) return;
				this.play(this.data.getAnim(this.currentMove, true));
				this.moveBop();

				this.waitForIdle?.cancel();
				this.waitForIdle = null;
				this.waitForIdle = wait(TIME_FOR_IDLE, () => {
					this.doMove("idle");
				});
			},
		},
	]);

	dancerObj.play(dancerObj.data.getAnim("idle"));
	dancerObj.pos = DANCER_POS;
	return dancerObj;
}

/** The type that a dancer game object would be */
export type DancerGameObj = ReturnType<typeof makeDancer>;
