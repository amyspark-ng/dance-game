import { Comp } from "kaplay";

export let gameCursor: cursorObjectType = null;
export type cursorDoing = "default" | "up" | "down" | "x" | "text" | "load";

interface customCursorComp extends Comp {
	do(doing: cursorDoing): void;
}

function cursorComponent(): customCursorComp {
	return {
		id: "cursorComponent",

		do(doing) {
			if (doing != "load") {
				if (this.angle != 0) this.angle = 0;
			}

			this.sprite = "cursor_" + doing;
		},
	};
}

/** Adds a cool mouse */
export function addCursorObject() {
	setCursor("none");

	let theMousePos = mousePos();

	let customBehaviours: (() => void)[] = [];

	let blinkTimer = 0;
	const mouse = add([
		sprite("cursor_default"),
		anchor("bot"),
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
			isHoveringAnObject: false,

			addAnimCondition(action: () => void) {
				customBehaviours.push(action);
			},
		},
	]);

	mouse.anchor = vec2(-0.5, -1);

	mouse.onUpdate(() => {
		if (mouse.typeMode) {
			mouse.canMove = false;

			blinkTimer += dt();
			if (blinkTimer >= 1) {
				blinkTimer = 0;
				mouse.opacity = 0;
				wait(0.25, () => {
					mouse.opacity = 1;
				});
			}

			return;
		}
		else {
			blinkTimer = 0;
			mouse.canMove = true;
		}

		// shown
		theMousePos = lerp(theMousePos, mousePos(), 0.8);
		if (mouse.intendedOpa == 1) {
			if (mouse.canMove) {
				if (isMouseMoved()) mouse.pos = theMousePos;
			}
		}
		else {
			mouse.pos = vec2();
		}

		if (mouse.sprite == "cursor_load") {
			if (Math.floor(time() * 15) % 2 == 0) {
				mouse.angle += 90 / 3;
				mouse.angle = mouse.angle % 360;
			}
		}

		mouse.opacity = lerp(mouse.opacity, mouse.intendedOpa, 0.5);

		// higher priority type mode
		if (mouse.typeMode) {
			if (mouse.sprite != "cursor_text") mouse.do("text");
			return;
		}

		// then the animations for game dialog
		const hoveredObjects = get("hover", { recursive: true });
		hoveredObjects.forEach((obj) => {
			if (!obj.isHovering()) {
				if (obj.dragging) mouse.do("down");
				else {
					if (hoveredObjects.some((otherObj) => otherObj.isHovering())) return;
					else {
						mouse.isHoveringAnObject = false;
						mouse.do("default");
					}
				}
			}
			else {
				if (obj.dragging || isMouseDown("left") || get("drag").some((obj) => obj.dragging)) mouse.do("down");
				else {
					mouse.do("up");
					mouse.isHoveringAnObject = true;
				}
			}
		});

		if (hoveredObjects.some((obj) => obj.isHovering())) return;

		customBehaviours.forEach((behav) => {
			behav();
		});

		if (hoveredObjects.length > 0) {
			mouse.intendedOpa = 1;
		}
		else {
			mouse.intendedOpa = 0;
		}
	});

	mouse.do("default");

	return mouse;
}

export type cursorObjectType = ReturnType<typeof addCursorObject>;

/** Actually sets the gameCursor object */
export function setupCursor() {
	gameCursor = addCursorObject();
	gameCursor.layer = "cursor";
}

export function loadCursor() {
	const doings = ["default", "up", "down", "x", "text", "load"];

	doings.forEach((dongo) => {
		loadSprite(`cursor_${dongo}`, "sprites/cursor/cursor_" + dongo + ".png");
	});
}
