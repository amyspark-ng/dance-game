import { Comp, GameObj, KEventController } from "kaplay";

/** Current object being dragged right now */
export let curDraggin: GameObj<DragComp> = null;

export function setCurDraggin(value = null) {
	curDraggin = value;
}

/**
 * The {@link drag `drag()`} component.
 *
 * @group Component Types
 */
export interface DragComp extends Comp {
	/** Wheter the object is being dragged or not */
	dragging: boolean;
	/** Pick the object (set {@link curDraggin `curDraggin`} to it) */
	pick(): void;
	/** Drop the object */
	drop(): void;
	/** Runs whenever the object is picked */
	onPick(action: () => void): KEventController;
	/** Runs every frame while the object is being dragged */
	onDragUpdate(action: () => void): KEventController;
	/** Runs when the object is dropped */
	onDrop(action: () => void): KEventController;
}

/**
 * Drag objects
 * @param onlyX - only drag it on the X axis
 * @param onlyY - only drag it on the Y axis
 */
export function drag(onlyX: boolean = false, onlyY: boolean = false): DragComp {
	// The displacement between object pos and mouse pos
	let offset = vec2(0);

	return {
		id: "drag",
		require: ["pos"],
		dragging: false,
		pick() {
			// Set the current global dragged to this
			curDraggin = this;
			offset = mousePos().sub(this.pos);
			this.trigger("pick");
			this.dragging = true;
		},

		drop() {
			curDraggin = null;
			this.dragging = false;
			this.trigger("drop");
		},

		update() {
			if (curDraggin === this) {
				if (this.dragging == false) this.dragging = true;
				if (onlyX == true) this.pos.x = mousePos().x - (offset.x);
				else if (onlyY == true) this.pos.y = mousePos().y - (offset.y);
				else this.pos = this.pos = mousePos().sub(offset);
				this.trigger("dragUpdate");
			}
			else {
				this.dragging = false;
			}
		},
		onPick(action: () => void): KEventController {
			return this.on("pick", action) as KEventController;
		},
		onDragUpdate(action: () => void) {
			return this.on("dragUpdate", action);
		},
		onDrop(action: () => void) {
			return this.on("drop", action);
		},
		inspect() {
			return `dragging: ${this.dragging}`;
		},
	};
}
