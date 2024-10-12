import { AreaComp, Comp, GameObj, PosComp, Vec2 } from "kaplay";
import { dragComp } from "../../plugins/features/drag";
import { playSound } from "../../plugins/features/sound";
import { GameSave } from "../../game/gamesave";

interface bounceableComp extends Comp {
	bounceMov: Vec2,
}

export function playBounceSound() {
	return playSound("bounce", { channel: GameSave.sound.sfx }).randomizePitch([-100, 100])
}

export type bounceableType = GameObj & bounceableComp & AreaComp & dragComp & PosComp

export function bounceable() : bounceableComp {
	const DRAG = -0.05

	function canBounce(thisObj:bounceableType) {
		return {
			x() {
				return thisObj.pos.x > width() && thisObj.bounceMov.x > 0 || thisObj.pos.x < 0 && thisObj.bounceMov.x < 0
			},
			y() {
				return thisObj.pos.y > height() && thisObj.bounceMov.y > 0 || thisObj.pos.y < 0 && thisObj.bounceMov.y < 0
			},
		}
	}

	return {
		require: ["area", "dragger", "pos"],
		
		bounceMov: vec2(0),

		add(this:bounceableType) {
			this.onClick(() => {
				this.bounceMov = vec2(0)
				this.pick()
				playSound("plap", { channel: GameSave.sound.sfx })
			})

			this.onMouseRelease(() => {
				if (this.dragging) {
					this.bounceMov = mouseDeltaPos()
					this.drop()
					playSound("plop", { channel: GameSave.sound.sfx })
				}
			})
		},

		update(this:bounceableType) {
			this.bounceMov = this.bounceMov.add( this.bounceMov.scale(DRAG) )
			this.pos = this.pos.add(this.bounceMov)
			
			if (canBounce(this).x()) {
				this.bounceMov.x *= -1
				playBounceSound()
			}
			else if (canBounce(this).y()) {
				this.bounceMov.y *= -1
				playBounceSound()
			}
		}
	}
}