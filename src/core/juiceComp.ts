import { Comp, EaseFunc, GameObj, ScaleComp, TweenController, Vec2 } from "kaplay";

type shakePanicReturnType = {
	/**
	 * Cancels the shake and returns the object to its initial position
	 */
	cancel: () => void;
};

type squishOpts = {
	/*** Wheter to stretch it horizontally or vertically (for both use Bop()) */
	XorY: "x" | "y";
	/*** The scale it will start at */
	startScale: number;
	/*** The scale it will end at  */
	endScale: number;
	/*** The time i'll take */
	theTime?: number;
	/*** The easing function */
	theEasing?: EaseFunc;
};

type bopOpts = {
	/*** The scale it will start at */
	startScale: number | Vec2;
	/*** The scale it will end at  */
	endScale: number | Vec2;
	/*** The time i'll take */
	theTime?: number;
	/*** The easing function */
	theEasing?: EaseFunc;
};

export interface juiceComp extends Comp {
	/**
	 * Stretches/squishes an object
	 * @param opts The options
	 * @returns The tween, maybe you can cancel it
	 */
	stretch(opts: squishOpts): TweenController;

	/**
	 * Bops an object (basically a shorthand for stretch on both sides, thought it was nicer)
	 *
	 * If howMuch is lesser than originalSize it will bop inwards
	 * @param originalSize The size the object originally had in vec2
	 * @param howMuch How much bop (scale multiplier)
	 * @param theTime How long i'll take for it to go back to normal
	 * @param theEasing The easing function
	 */
	bop(opts: bopOpts): TweenController;

	/**
	 * Shakes an object
	 * @param initialPos The position it initially was at
	 * @param time How long will it shake for
	 * @param strength The strength of the shake (how much it will move in pixels)
	 * @param interval How long between each shake
	 */
	shakePanic(initialPos: Vec2, time?: number, strength?: number, interval?: number): shakePanicReturnType;

	/**
	 * Will move the object from a random direction to the original one, tweaking!!
	 * @param initialPos The position it initially was at
	 * @param includeDiagonals Wheter to include diagonals or only cardinals
	 * @param strength How far will it go (it's a multiplier so something like 2 or 3 should work)
	 * @param theTime how long will it take to come back
	 * @param easeFunc The easing function
	 */
	tweak(
		initialPos: Vec2,
		includeDiagonals?: boolean,
		strength?: number,
		theTime?: number,
		easeFunc?: EaseFunc,
	): TweenController;
}

/**
 * Component that gives some juice functions
 * @requires Scale, Pos, Timer
 */
export function juice(): juiceComp {
	return {
		id: "juice",
		require: ["scale", "pos"],

		stretch(opts: squishOpts) {
			opts.XorY = opts.XorY ?? "y";
			opts.theTime = opts.theTime ?? 0.5;
			opts.theEasing = opts.theEasing ?? easings.easeOutQuad;

			return tween(
				opts.startScale,
				opts.endScale,
				opts.theTime,
				(p) => this.scale[opts.XorY] = p,
				opts.theEasing,
			);
		},

		bop(opts: bopOpts) {
			if (typeof opts.startScale == "number") opts.startScale = vec2(opts.startScale);
			if (typeof opts.endScale == "number") opts.endScale = vec2(opts.endScale);

			opts.theTime = opts.theTime ?? 0.5;
			opts.theEasing = opts.theEasing ?? easings.easeOutQuad;

			return tween(opts.startScale, opts.endScale, opts.theTime, (p) => this.scale = p, opts.theEasing);
		},

		tweak(initialPos, includeDiagonals?, strength?, theTime?, easeFunc?) {
			includeDiagonals = includeDiagonals ?? true;
			strength = strength ?? 2;
			theTime = theTime ?? 0.5;
			easeFunc = easeFunc ?? easings.easeOutQuint;

			const directions = {
				"left": LEFT,
				"right": RIGHT,
				"top": UP,
				"bot": DOWN,
			};

			if (includeDiagonals == false) {
				directions["botleft"] = vec2(-1, 1);
				directions["topleft"] = vec2(-1, -1);

				directions["botright"] = vec2(1, 1);
				directions["botleft"] = vec2(1, -1);
			}

			let direction = choose(Object.values(directions));
			direction = direction.scale(strength);

			let newPos = vec2();
			newPos.x = initialPos.x + direction.x * strength;
			newPos.y = initialPos.y + direction.y * strength;

			return tween(newPos, initialPos, theTime, (p) => this.pos = p, easeFunc);
		},

		shakePanic(initialPos: Vec2, time?: number, strength?: number, interval?: number): shakePanicReturnType {
			const thisObj = this;

			time = time ?? 1;
			strength = strength ?? 10;
			interval = interval ?? 0.05;

			let shakeLoop = loop(interval, () => {
				const newPos = initialPos.add(rand(-strength, strength), rand(-strength, strength));
				thisObj.pos = newPos;
			});

			function cancelFunction() {
				shakeLoop.cancel();
				thisObj.pos = initialPos;
			}

			let waitThing = wait(time, cancelFunction);
			thisObj.onDestroy(() => waitThing.cancel());

			return {
				cancel: cancelFunction,
			};
		},
	};
}
