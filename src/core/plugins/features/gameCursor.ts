import { Comp } from "kaplay"

export let gameCursor:cursorObjectType = null
export type cursorDoing = "default" | "up" | "down" | "x" | "text"

interface customCursorComp extends Comp {
	do(doing:cursorDoing): void
}

function cursorComponent() : customCursorComp {
	return {
		id: "cursorComponent",
		
		do(doing) {
			this.sprite = "cursor_" + doing
		},
	}
}

/** Adds a cool mouse */
export function addCursorObject() {
	setCursor("none")
	
	let theMousePos = mousePos()
	
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

			hide() {
				this.intendedOpa = 0
			},

			show() {
				this.intendedOpa = 1
			},

			update() {
				// shown
				if (this.intendedOpa == 1) {
					theMousePos = lerp(theMousePos, mousePos(), 0.8)
					if (this.canMove) {
						if (isMouseMoved()) this.pos = theMousePos
					}
				}

				else {
					this.pos = vec2()
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
	const doings = ["default", "up", "down", "x", "text"]

	doings.forEach((dongo) => {
		loadSprite(`cursor_${dongo}`, "sprites/cursor/cursor_" + dongo + ".png")
	})
}