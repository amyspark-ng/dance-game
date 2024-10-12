import { Comp, GameObj, KEventController } from "kaplay";

const TILT_TOWARDS_MOUSE_LERP = 0.8

export interface dragComp extends Comp {
	/**
	 * Will set the new dragged object to this
	 */
	pick: () => void
	/**
	 * Will set the new dragged object too NULL
	 */
	drop: () => void,
	/**
	 * Runs when the object starts being dragged
	 * @param action The function you want to run
	 */
	onPick(action: () => void) : () => KEventController,
	/**
	 * Runs every frame the object is being dragged
	 * @param action The function you want to run
	 */
	onDragUpdate(action: () => void) : () => KEventController,
	/**
	 * Runs when the object is dropped
	 * @param action The function you want to run
	 */
	onDrop(action: () => void) : () => KEventController,
	/**
	 * Is true if the object is being dragged
	 */
	dragging: boolean,
}

// Keep track of the current draggin item
let curDraggin:GameObj | null = null;

export const drag = {
	/**
	 * Gets the object that is currently being dragged
	 * @returns Either the object, or null, which would mean that there's no object being dragged
	 */
	getCurDragging: () => curDraggin,
	/**
	 * Sets the new object that is being dragged, will override if one is already being dragged
	 * @warning Will override the current dragged object
	 * @param newValue The new object that is being dragged
	 */
	setCurDragging: (newValue: any) => {
		curDraggin = newValue
	}
}

/**
 * Custom component for handling drag and drop behaviour
 * @param onlyX Wheter to only move the object on the X axis
 * @param onlyY Wheter to only move the object on the Y axis
 * @param tiltTowardsMouse You can set this to true so the object tilts towards the mouse (will require rotateComp)
 */
export function dragger(tiltTowardsMouse?:boolean, onlyX?:boolean, onlyY?:boolean) : dragComp {
	// The displacement between object pos and mouse pos
	let offset = vec2(0);

	onlyX = onlyX ?? false
	onlyY = onlyY ?? false
	tiltTowardsMouse = tiltTowardsMouse ?? false

	return {
		id: "dragger",
		require: ["pos", "area"],
		dragging: false,
		
		// pick stuff
		pick() {
			drag.setCurDragging(this);
			offset = mousePos().sub(this.pos);
			this.dragging = true
		
			this.trigger("drag");
		},

		onPick(action: () => void) {
			return this.on("drag", action);
		},

		// drop stuff
		drop() {
			drag.setCurDragging(null)
			this.dragging = false
			if (this.angle !== 0 && tiltTowardsMouse == true && mouseDeltaPos().x > 0) this.angle = 0 

			this.trigger("dragEnd");
		},

		onDrop(action: () => void) {
			return this.on("dragEnd", action);
		},
		
		// update stuff
		update() {
			if (curDraggin === this) {
				if (onlyX == true) this.pos.x = mousePos().x - (offset.x)
				else if (onlyY == true) this.pos.y = mousePos().y - (offset.y)
				else this.pos = mousePos().sub(offset);
				this.trigger("dragUpdate");

				if (tiltTowardsMouse) {
					if (!this.is("rotate")) throw new Error("Tilt towards mouse requires RotateComp")
					this.angle = lerp(this.angle, mouseDeltaPos().x, TILT_TOWARDS_MOUSE_LERP)
				}
			}
		},

		onDragUpdate(action: () => void) {
			return this.on("dragUpdate", action);
		},
	};
}