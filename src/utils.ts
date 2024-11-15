import { Color, Rect, Vec2 } from "kaplay";
import { arrayBuffer } from "stream/consumers";

type coolFormatNumberOpt = {
	/**
	 * Simple - Idk
	 * 
	 * Decimal - 1 = 1.0 | 0 = 0.0
	 */
	type: "simple" | "decimal"
}

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

	static addInIndex(arr: any[], element:any, index:number) {
		return arr.splice(index, 0, element)
	}

	/** A pretty cool star */
	static star = "★"

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
		const arrCopy = [...arr]
		arrCopy.splice(arr.indexOf(el), 1)
		return arrCopy
	}

	/** Gets the value of a path in a given object */
	static getVar(obj:any, path:string) {
		const parts = path.split(".")
		const target = parts.slice(0, -1).reduce((o, p) => o[p], obj)
		return target[parts[parts.length-1]]
	}

	/** Sets the value of a property in a given object and path */
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
	 * Function to get the position of an object in a grid
	 * @param initialpos It's the initial pos the objects will be at, column 0 and row 0 means this exact position
	 * @param row These are objects displayed vertically, the greater it is the more to the bottom they'll be
	 * @param column These are objects displayed horizontally, the greater it is the more to the right they'll be 
	 * @param spacing It's the spacing objects will have, if you set Y spacing to 0, the objects won't be more apart when changing the row  
	 * @returns A Vec2 with the position of the object
	 */
	static getPosInGrid(initialpos:Vec2, row:number, column:number, spacing:Vec2) {
		return vec2(initialpos.x + spacing.x * (column), initialpos.y + spacing.y * (row));
	}

	/** Formats time with minutes, seconds and miliseconds */
	static formatTime(timeInSeconds: number, includeMs:boolean = false) : string {
		return `${Math.floor(timeInSeconds / 60)}:${("0" + Math.floor(timeInSeconds % 60)).slice(-2)}${includeMs ? `:${("0" + Math.floor((timeInSeconds % 1) * 1000)).slice(-3)}` : ""}`
	}

	/** Converts string to kebab case (eg: Hello, World! -> hello-world) */
	static kebabCase(str:string) {
		return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase().replaceAll(" ", "-").replaceAll("'", "");
	}

	/** Makes it so it's always fixed to 0.1 or 1.2 or 0.0 */
	static fixDecimal(num: number) {
		return parseFloat(num.toFixed(1))
	}

	/** Formats a number */
	static formatNumber(num:number, opts: coolFormatNumberOpt) {
		if (opts.type == "decimal") {
			return num.toFixed(1)
		}

		else {
			return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
		}
	}

	/** Returns if a number is between a range */
	static isInRange(num: number, max: number, min: number) : boolean {
		return num >= min && num <= max
	}

	// thank you u/LambentLight
	/** Converts width and height to the radius of a circle */
	static widthAndHeightToRadius(size: Vec2) {
		return (size.y / 2) + ((size.x) / (8 * size.y))
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

	static arrayBufferToBase64(buffer:ArrayBuffer) {
		return JSON.stringify(buffer)
	};

	static base64ToArrayBuffer(base64:string) {
		return new ArrayBuffer(JSON.parse(base64))
	}

	/** Careful with this, it actually converts to wav but it somehows works when sending as .ogg LOL */
	static audioBufferToOGG(audioBuffer:AudioBuffer) : Blob {
		// Helper function to write a string to the DataView
		function writeString(view: DataView<ArrayBuffer>, offset: number, string: string) {
			for (let i = 0; i < string.length; i++) {
				view.setUint8(offset + i, string.charCodeAt(i));
			}
		}
		
		const numOfChannels = audioBuffer.numberOfChannels;
		const sampleRate = audioBuffer.sampleRate;
		const format = 1; // PCM format
		const bitDepth = 16;
	
		// Calculate the size of the output buffer
		const samples = audioBuffer.length;
		const blockAlign = numOfChannels * (bitDepth / 8);
		const byteRate = sampleRate * blockAlign;
		const bufferLength = 44 + samples * blockAlign;
	
		// Create an ArrayBuffer for the WAV file
		const arrayBuffer = new ArrayBuffer(bufferLength);
		const view = new DataView(arrayBuffer);
	
		// Write WAV header
		writeString(view, 0, 'RIFF');                         // ChunkID
		view.setUint32(4, 36 + samples * blockAlign, true);   // ChunkSize
		writeString(view, 8, 'WAVE');                         // Format
		writeString(view, 12, 'fmt ');                        // Subchunk1ID
		view.setUint32(16, 16, true);                         // Subchunk1Size
		view.setUint16(20, format, true);                     // AudioFormat
		view.setUint16(22, numOfChannels, true);              // NumChannels
		view.setUint32(24, sampleRate, true);                 // SampleRate
		view.setUint32(28, byteRate, true);                   // ByteRate
		view.setUint16(32, blockAlign, true);                 // BlockAlign
		view.setUint16(34, bitDepth, true);                   // BitsPerSample
		writeString(view, 36, 'data');                        // Subchunk2ID
		view.setUint32(40, samples * blockAlign, true);       // Subchunk2Size
	
		// Write interleaved PCM samples
		let offset = 44;
		for (let i = 0; i < samples; i++) {
			for (let channel = 0; channel < numOfChannels; channel++) {
				const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
				view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
				offset += 2;
			}
		}
	
		return new Blob([view], { type: "audio/ogg" });
	}
}

export let deepDiffMapper = function () {
	return {
	  VALUE_CREATED: 'created',
	  VALUE_UPDATED: 'updated',
	  VALUE_DELETED: 'deleted',
	  VALUE_UNCHANGED: 'unchanged',
	  map: function(obj1, obj2) {
		if (this.isFunction(obj1) || this.isFunction(obj2)) {
		  throw 'Invalid argument. Function given, object expected.';
		}
		if (this.isValue(obj1) || this.isValue(obj2)) {
		  return {
			type: this.compareValues(obj1, obj2),
			data: obj1 === undefined ? obj2 : obj1
		  };
		}
  
		var diff = {};
		for (var key in obj1) {
		  if (this.isFunction(obj1[key])) {
			continue;
		  }
  
		  var value2 = undefined;
		  if (obj2[key] !== undefined) {
			value2 = obj2[key];
		  }
  
		  diff[key] = this.map(obj1[key], value2);
		}
		for (var key in obj2) {
		  if (this.isFunction(obj2[key]) || diff[key] !== undefined) {
			continue;
		  }
  
		  diff[key] = this.map(undefined, obj2[key]);
		}
  
		return diff;
  
	  },
	  compareValues: function (value1, value2) {
		if (value1 === value2) {
		  return this.VALUE_UNCHANGED;
		}
		if (this.isDate(value1) && this.isDate(value2) && value1.getTime() === value2.getTime()) {
		  return this.VALUE_UNCHANGED;
		}
		if (value1 === undefined) {
		  return this.VALUE_CREATED;
		}
		if (value2 === undefined) {
		  return this.VALUE_DELETED;
		}
		return this.VALUE_UPDATED;
	  },
	  isFunction: function (x) {
		return Object.prototype.toString.call(x) === '[object Function]';
	  },
	  isArray: function (x) {
		return Object.prototype.toString.call(x) === '[object Array]';
	  },
	  isDate: function (x) {
		return Object.prototype.toString.call(x) === '[object Date]';
	  },
	  isObject: function (x) {
		return Object.prototype.toString.call(x) === '[object Object]';
	  },
	  isValue: function (x) {
		return !this.isObject(x) && !this.isArray(x);
	  }
	}
  }();
  