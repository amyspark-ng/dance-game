import { Color, Comp, Outline, Quad, Vec2 } from "kaplay";

interface drawDumbOutlineComp extends Comp {
	/** Outline size */
	outlineScale: Vec2,
	outlineColor: Color,
}

/** Comp that draws a dumb outline with size */
export function dumbOutline(outlineScale: Vec2, outlineColor: Color) : drawDumbOutlineComp {
	return {
		id: "drawDumbOutline",
		require: [ "sprite" ],
		outlineScale: outlineScale,
		outlineColor: outlineColor,
		
		add() {
			let quad:Quad = null;
			getSprite(this.sprite).then((data) => quad = data.frames[0] )
			const u_time = 1
			const u_pos = vec2(quad.x, quad.y)
			const u_size = vec2(quad.w, quad.h)

			this.parent.onDraw(() => {
				if (this.outlineSize <= 0) return

				drawSprite({
					width: this.outlineScale.x,
					height: this.outlineScale.y,
					sprite: this.sprite,
					pos: this.pos ?? vec2(0, 0),
					angle: this.angle ?? 0,
					color: BLACK,
					fixed: this.fixed ?? false,
					anchor: this.anchor ?? "topleft",
					opacity: this.opacity ?? 1,
					shader: "saturate",
					uniform: {
						"u_time": u_time,
						"u_pos": u_pos,
						"u_size": u_size,
						"u_color": this.outlineColor
					}
				})
			})
		},
	}
}