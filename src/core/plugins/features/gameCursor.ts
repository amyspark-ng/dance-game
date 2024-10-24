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
		scale(),
		layer("cursor"),
		"gameCursor",
		{
			update() {
				theMousePos = lerp(theMousePos, mousePos(), 0.8)

				if (isMouseMoved()) this.pos = theMousePos
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