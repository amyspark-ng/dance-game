import { Comp, KEventController, LoadSpriteOpt, SpriteData, TimerController, TweenController, Vec2 } from "kaplay";
import { juice } from "../../core/juiceComp";
import { Content } from "../../core/loading/content";
import { GameSave } from "../../core/save";

export const moveAnimsArr = ["left", "down", "up", "right"] as const;
/** The moves in the gameplay, also handles the note type */
export type Move = typeof moveAnimsArr[number];

/** The moves the dancer can make */
export type MoveAnim = Move | "idle";

/** Time it'll take for the dancer to go back to idleing */
const TIME_FOR_IDLE = 1;

export const DANCER_POS = vec2(518, 377);
export function makeDancer(dancerName: string) {
	let onAnimEndEvent: KEventController = null;

	const dancerObj = make([
		sprite(Content.getDancerByName(dancerName).name, { anim: "idle" }),
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

			doMove(move: MoveAnim): void {
				if (this.forcedAnim) return;

				onAnimEndEvent?.cancel();
				this.play(move);

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

			/** Gets the current move
			 * @warning If it returns undefined it means it's doing other thing
			 */
			getMove(): MoveAnim {
				const curAnimName = this.getCurAnim()?.name;
				if (moveAnimsArr.includes(curAnimName)) return curAnimName;
				else return undefined;
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

export class DancerData {
	name: string;
	animData: LoadSpriteOpt;
	bgAnimData: LoadSpriteOpt;
	constructor(name: string, animData?: LoadSpriteOpt, bgAnimData?: LoadSpriteOpt) {
		this.name = name;
		this.animData = animData;
		this.bgAnimData = bgAnimData;
	}
}
