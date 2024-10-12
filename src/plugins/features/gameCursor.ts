import { Comp } from "kaplay"

export let gameCursor:cursorObjectType = null

interface customCursorComp extends Comp {
	/** Points */
	point: () =>  void
	/** Is the default animation */
	default: () =>  void
}

function cursorComponent() : customCursorComp {
	return {
		id: "cursorComponent",
		
		point() {
			this.sprite = "pointer"
		},

		default() {
			this.sprite = "cursor"	
		}
	}
}

/** Adds a cool mouse */
export function addCursorObject() {
	setCursor("none")
	
	let theMousePos = mousePos()
	
	const mouse = add([
		sprite("cursor"),
		anchor("topleft"),
		pos(),
		cursorComponent(),
		stay(),
		fixed(),
		z(0),
		layer("cursor"),
		"gameCursor",
		{
			update() {
				theMousePos = lerp(theMousePos, mousePos(), 0.8)

				if (isMouseMoved()) this.pos = theMousePos
			}
		}
	])

	return mouse;
}

export type cursorObjectType = ReturnType<typeof addCursorObject>

/** Actually sets the gameCursor object */
export function setupCursor() {
	gameCursor = addCursorObject()
	gameCursor.layer = "cursor"
}