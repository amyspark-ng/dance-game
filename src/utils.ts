import { Color, EaseFunc, Vec2 } from "kaplay";
import { FileManager } from "./FileManager";

type coolFormatNumberOpt = {
	/**
	 * Simple - Idk
	 *
	 * Decimal - 1 = 1.0 | 0 = 0.0
	 */
	type: "simple" | "decimal";
};

/** A simple utility class */
export class utils {
	/**
	 * This function will run only when the game is running on desktop
	 * @param action The function
	 */
	static runInDesktop(action: () => void) {
		if ("__TAURI__" in window) {
			action();
		}
	}

	static addInIndex(arr: any[], element: any, index: number) {
		return arr.splice(index, 0, element);
	}

	/** A pretty cool star */
	static star = "★";

	/** Gets a random position between 0 and width and height */
	static randomPos() {
		return vec2(rand(0, width()), rand(0, height()));
	}

	/** Gets a random color */
	static randomColor() {
		return rgb(rand(0, 255), rand(0, 255), rand(0, 255));
	}

	/** Returns an array with the specified element removed from it */
	static removeFromArr(el: any, arr: any[]) {
		const arrCopy = [...arr];
		arrCopy.splice(arr.indexOf(el), 1);
		return arrCopy;
	}

	/** Gets the value of a path in a given object */
	static getVar(obj: any, path: string) {
		const parts = path.split(".");
		const target = parts.slice(0, -1).reduce((o, p) => o[p], obj);
		return target[parts[parts.length - 1]];
	}

	/** Sets the value of a property in a given object and path */
	static setVar(obj: any, path: string, value: any) {
		const parts = path.split(".");
		const target = parts.slice(0, -1).reduce((o, p) => o[p], obj);
		target[parts[parts.length - 1]] = value;
	}

	/**
	 * Function to get the position of an object in a grid
	 * @param initialpos It's the initial pos the objects will be at, column 0 and row 0 means this exact position
	 * @param row These are objects displayed vertically, the greater it is the more to the bottom they'll be
	 * @param column These are objects displayed horizontally, the greater it is the more to the right they'll be
	 * @param spacing It's the spacing objects will have, if you set Y spacing to 0, the objects won't be more apart when changing the row
	 * @returns A Vec2 with the position of the object
	 *
	 * 3 Columns means 3 ojects laid horizontally, 3 rows is 3 objects laid vertically from
	 *
	 * From top to bottom it will look like this
	 *
	 *  ccc
	 *
	 * r...
	 *
	 * r...
	 *
	 * Being the ccc 3 colums and the r...r... 2 rows
	 *
	 * Confusing right
	 */
	static getPosInGrid(initialpos: Vec2, row: number, column: number, spacing: Vec2) {
		return vec2(initialpos.x + spacing.x * column, initialpos.y + spacing.y * row);
	}

	/** Formats time with minutes, seconds and miliseconds */
	static formatTime(timeInSeconds: number, includeMs: boolean = false): string {
		return `${Math.floor(timeInSeconds / 60)}:${("0" + Math.floor(timeInSeconds % 60)).slice(-2)}${
			includeMs ? `:${("0" + Math.floor((timeInSeconds % 1) * 1000)).slice(-3)}` : ""
		}`;
	}

	/** Converts string to kebab case (eg: Hello, World! -> hello-world) */
	static kebabCase(str: string) {
		return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase().replaceAll(" ", "-").replaceAll("'", "");
	}

	/** Makes it so it's always fixed to 0.1 or 1.2 or 0.0 */
	static fixDecimal(num: number) {
		return parseFloat(num.toFixed(1));
	}

	/** Formats a number */
	static formatNumber(num: number, opts: coolFormatNumberOpt) {
		if (opts.type == "decimal") {
			return num.toFixed(1);
		}
		else {
			return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
		}
	}

	/** Returns if a number is between a range */
	static isInRange(num: number, min: number, max: number): boolean {
		return num >= min && num <= max;
	}

	// thank you u/LambentLight
	/** Converts width and height to the radius of a circle */
	static widthAndHeightToRadius(size: Vec2) {
		return (size.y / 2) + ((size.x) / (8 * size.y));
	}

	/** A real roundabout of just doing col1.lerp(col2, 0.5) */
	static blendColors(col1: Color, col2: Color, blendFactor: number) {
		return col1.lerp(col2, blendFactor) as Color;
	}

	/**
	 * Does the thing where if the number is below then goes to top and visceversa
	 * @param index The current index
	 * @param change The change between the indexes
	 * @param totalAmount The total amounts of elements
	 */
	static scrollIndex(index: number, change: number, totalAmount: number) {
		if (totalAmount == 0) throw new Error("Something must be wrong with your code, scrollIndex amount is 0");
		// why was this so hard to figure out??
		if (change > 0) {
			if (index + change > totalAmount - 1) index = 0;
			else index += change;
		}
		else if (change < 0) {
			if (index - Math.abs(change) < 0) index = totalAmount - 1;
			else index -= Math.abs(change);
		}

		return index;
	}

	/** Get the extension of a filename given the filename */
	static getExtensionFromFilename(filename: string) {
		return filename.split(".").pop();
	}

	static caseWord(word: string, theCase: "upper" | "lower") {
		return theCase == "lower"
			? word.charAt(0) + word.substring(1).toUpperCase()
			: word.charAt(0) + word.substring(1).toLowerCase();
	}

	/** Like the opposite of kebab??? */
	static unIdText(text: string) {
		return utils.caseWord(text.replace("_", " ").replace("-", " "), "upper");
	}

	static getEasingByIndex(idx: number): EaseFunc {
		return easings[Object.keys(easings)[idx]];
	}

	static countDecimals(number: number) {
		if (Math.floor(number) === number) return 1;
		return number.toString().split(".")[1].length || 0;
	}

	static isURL(url: string) {
		const urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i;
		return urlPattern.test(url);
	}

	static async getAverageColorOfSprite(sprite: string): Promise<Color> {
		/* https://stackoverflow.com/questions/2541481/get-average-color-of-image-via-javascript */
		return new Promise(async (resolve) => {
			let context = document.createElement("canvas").getContext("2d");
			context!.imageSmoothingEnabled = true;

			const src = await FileManager.spriteToDataURL(sprite);
			let img = new Image();
			img.src = src;
			img.crossOrigin = "";

			img.onload = () => {
				context!.drawImage(img, 0, 0, 1, 1);
				const data = context!.getImageData(0, 0, 1, 1).data.slice(0, 3);
				resolve(rgb(data[0], data[1], data[2]));
			};
		});

		// const col = await utils.getAverageColorOfSprite(capsule.song.getCoverName());

		// add([
		// 	rect(50, 50),
		// 	color(col),
		// ]);
	}
}
