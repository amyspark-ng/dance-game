import { Color, Vec2 } from "kaplay";

/** A simple utility class */
export class utils {
	/**
	 * This function will run only when the game is running on desktop
	 * @param action The function
	 */
	static runInDesktop(action: () => void) {
		if ('__TAURI__' in window) {
			action()
		}
	}
	
	/** Gets a random position between 0 and width and height */
	static randomPos() {
		return vec2(rand(0, width()), rand(0, height()))
	}

	/** Gets a random color */
	static randomColor() {
		return rgb(rand(0, 255), rand(0, 255), rand(0, 255))
	}

	// 3 columns means 3 objects laid horizontally, 3 rows is 3 objects laid vertically
	// from top to bottom
	//   ccc
	//  r...
	//  r...
	/**
	 * Function to get the position of an object in a grid, it works like this:
	 * Row 0 and Column 0 mean initialPos btw
	 * @param initialpos It's the initial pos the objects will be at, column 0 and row 0 means this exact position
	 * @param row These are objects displayed vertically, the greater it is the more to the bottom they'll be
	 * @param column These are objects displayed horizontally, the greater then column the more to the right 
	 * @param spacing It's the spacing objects will have, if you set Y spacing to 0, the objects won't be more apart when changing the row  
	 * @returns A Vec2 with the position of the object
	 */
	static getPosInGrid(initialpos:Vec2, row:number, column:number, spacing:Vec2) {
		return vec2(initialpos.x + spacing.x * (column), initialpos.y + spacing.y * (row));
	}

	/** A real roundabout of just doing col1.lerp(col2, 0.5) */
	static blendColors(col1: Color, col2: Color, blendFactor: number) {
		return col1.lerp(col2, blendFactor) as Color
	}
}