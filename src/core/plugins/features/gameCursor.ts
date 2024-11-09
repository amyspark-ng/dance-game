import { Comp } from "kaplay"

export let gameCursor:cursorObjectType = null
export type cursorDoing = "default" | "up" | "down" | "x" | "text" | "load"

interface customCursorComp extends Comp {
	do(doing:cursorDoing): void
}

function cursorComponent() : customCursorComp {
	return {
		id: "cursorComponent",
		
		do(doing) {
			if (doing != "load") {
				if (this.angle != 0) this.angle = 0;
			}
			
			this.sprite = "cursor_" + doing
		},
	}
}

/** Adds a cool mouse */
export function addCursorObject() {
	setCursor("none")
	
	let theMousePos = mousePos()
	
	let blinkTimer = 0;
	const mouse = add([
		sprite("cursor_default"),
		anchor("topleft"),
		pos(),
		cursorComponent(),
		stay(),
		fixed(),
		rotate(0),
		z(0),
		color(),
		opacity(),
		scale(),
		layer("cursor"),
		"gameCursor",
		{
			/** Intended opacity */
			intendedOpa: 1,
			canMove: true,
			typeMode: false,

			hide() {
				this.intendedOpa = 0
			},

			show() {
				this.intendedOpa = 1
			},

			update() {
				if (this.typeMode) {
					this.canMove = false
					
					blinkTimer += dt()
					if (blinkTimer >= 1) {
						blinkTimer = 0
						this.opacity = 0
						wait(0.25, () => {
							this.opacity = 1
						})
					}

					return;
				}

				else {
					blinkTimer = 0
					this.canMove = true
				}
				
				// shown
				theMousePos = lerp(theMousePos, mousePos(), 0.8)
				if (this.intendedOpa == 1) {
					if (this.canMove) {
						if (isMouseMoved()) this.pos = theMousePos
					}
				}

				else {
					this.pos = vec2()
				}
				
				if (this.sprite == "cursor_load") {
					if (Math.floor(time()*15)%2==0) {
						this.angle += 90 / 3
						this.angle = this.angle % 360
					}
				}
				
				this.opacity = lerp(this.opacity, this.intendedOpa, 0.5)
			}
		}
	])

	mouse.do("default")

	return mouse;
}

export type cursorObjectType = ReturnType<typeof addCursorObject>

/** Actually sets the gameCursor object */
export function setupCursor() {
	gameCursor = addCursorObject()
	gameCursor.layer = "cursor"
}

export function loadCursor() {
	const doings = ["default", "up", "down", "x", "text", "load"]

	doings.forEach((dongo) => {
		loadSprite(`cursor_${dongo}`, "sprites/cursor/cursor_" + dongo + ".png")
	})
}