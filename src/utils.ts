import { Color, Rect, Vec2 } from "kaplay";

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

	/** Returns an array with the specified element removed from it */
	static removeFromArr(el: any, arr: any[]) {
		return arr.filter((e) => e != el)
	}

	/** Gets the value of a path in a given object */
	static getVar(obj:any, path:string) {
		const parts = path.split(".")
		const target = parts.slice(0, -1).reduce((o, p) => o[p], obj)
		return target[parts[parts.length-1]]
	}

	static setVar(obj:any, path:string, value:any) {
		const parts = path.split(".")
		const target = parts.slice(0, -1).reduce((o, p) => o[p], obj)
		target[parts[parts.length-1]] = value
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

	/** Formats time with miutes, seconds and miliseconds */
	static formatTime(timeInSeconds: number, includeMs:boolean = false) : string {
		return `${Math.floor(timeInSeconds / 60)}:${("0" + Math.floor(timeInSeconds % 60)).slice(-2)}${includeMs ? `:${("0" + Math.floor((timeInSeconds % 1) * 1000)).slice(-3)}` : ""}`
	}

	static formatNumber(num: number) : string {
		return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
		debug.log(num)
	}

	/** Returns if a number is between a range */
	static isInRange(num: number, max: number, min: number) : boolean {
		return num >= min && num <= max
	}

	// thank you u/LambentLight
	/** Converts with and height to a radius of a circle */
	static widthAndHeightToRadius(size: Vec2) {
		return (size.y / 2) + ((size.x) / (8 * size.y))
	}

	/**
	 * If a certain position is within a range of points (like a square)
	 * @param posPoint The point to check
	 * @param squarePoints 0: topleft, 1: topright, 2: botleft: 3: botright 
	 */
	static isPosInSquare(posPoint: Vec2, squarePoints: [Vec2, Vec2, Vec2, Vec2] | Vec2[]) {
		const topleft = squarePoints[0]
		const topright = squarePoints[1]
		const botleft = squarePoints[2]
		const botright = squarePoints[3]

		return this.isInRange(posPoint.x, topleft.x, topright.x) && this.isInRange(posPoint.y, topright.y, botright.y)
	}

	/** A real roundabout of just doing col1.lerp(col2, 0.5) */
	static blendColors(col1: Color, col2: Color, blendFactor: number) {
		return col1.lerp(col2, blendFactor) as Color
	}

	/**
	 * Does the thing where if the number is below then goes to top and visceversa
	 * @param index The current index
	 * @param change The change between the indexes
	 * @param totalAmount The total amounts of elements
	 */
	static scrollIndex(index: number, change: number, totalAmount: number) {
		// why was this so hard to figure out??
		if (change > 0) {
			if (index + change > totalAmount - 1) index = 0
			else index += change
		}

		else if (change < 0) {
			if (index - Math.abs(change) < 0) index = totalAmount - 1
			else index -= Math.abs(change)
		}

		return index;
	}
}