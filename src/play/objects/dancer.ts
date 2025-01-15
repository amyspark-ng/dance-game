import { Comp, KEventController, TimerController, TweenController, Vec2 } from "kaplay";
import { GameSave } from "../../core/gamesave";
import { juice } from "../../core/plugins/graphics/juiceComponent";

/** Moves available for the dancer, also handles the note type */
export type Move = "left" | "right" | "up" | "down" | "idle";

/** Time it'll take for the dancer to go back to idleing */
const TIME_FOR_IDLE = 1;

export const DANCER_POS = vec2(518, 377);
export function makeDancer(dancerName: string) {
	let onAnimEndEvent: KEventController = null;

	const dancerObj = make([
		sprite("dancer_" + dancerName, { anim: "idle" }),
		pos(center().x, height()),
		anchor("bot"),
		scale(),
		juice(),
		z(2),
		"dancerObj",
		{
			intendedScale: vec2(1),
			forcedAnim: false,
			/** The timer controller for the wait for the idle */
			waitForIdle: null as KEventController,
			add() {
				this.waitForIdle = wait(0);
			},

			doMove(move: Move): void {
				if (this.forcedAnim) return;

				onAnimEndEvent?.cancel();
				this.play(move);

				if (move != "idle") {
					this.moveBop();

					this.waitForIdle?.cancel();
					this.waitForIdle = wait(TIME_FOR_IDLE, () => {
						const keyForMove = Object.values(GameSave.gameControls).find((gameKey) =>
							gameKey.move == move
						).kbKey;
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
			 * @returns The tween, check juice stretch for more info
			 */
			moveBop(): TweenController {
				this.scale.x = this.intendedScale.x;
				return this.stretch({
					XorY: "y",
					startScale: this.intendedScale.y * 0.9,
					endScale: this.intendedScale.y,
					theTime: 0.25,
				});
			},

			/** Gets the current move */
			getMove(): Move {
				return this.getCurAnim()?.name ?? "idle";
			},

			/** miss */
			miss(): void {
				if (this.forcedAnim) return;
				this.play("miss");
				this.moveBop();

				this.waitForIdle?.cancel();
				this.waitForIdle = null;
				this.waitForIdle = wait(TIME_FOR_IDLE, () => {
					this.doMove("idle");
				});
			},
		},
	]);

	dancerObj.pos = DANCER_POS;
	return dancerObj;
}

/** The type that a dancer game object would be */
export type DancerGameObj = ReturnType<typeof makeDancer>;

/** Class that holds some info related to a dancer */
export class DancerFile {
	dancerName: string;
	dancerBg: string;
}
