import audioBufferToBlob from "audiobuffer-to-blob";
import { gameCursor } from "./core/cursor";

export const IMAGE_HELPER = "data:image/png;base64,";
export const AUDIO_HELPER = "data:audio/wav;base64,";

/** File manager for some stuff of the game */
export const inputElement = document.createElement("input");
inputElement.type = "file";
inputElement.style.display = "none";

/** This class is a series of "utils" and important functions to manage some of the files that might be related to the content of the game
 *
 * The process of loading a real song of the game goes like this
 * 1. We call the {@link fetchSongFolder `fetchSongFolder()`} function which will return an object of type {@link songFolder}
 * 2. Then we have to call the {@link loadSongAssets `loadSongAssets()`} function to load the assets of the song
 *
 * The process of loading a (custom) song has 2 steps
 * 1. First we call the {@link receiveFile `receiveFile()`} function to get a file from the user
 * this will return an object of type {@link songFolder}
 *
 * 2. Then we have to call the {@link loadSongAssets `loadSongAssets()`} function to load the assets of the song
 * this function will take as a parameter a {@link songFolder}, this way it can access the files and load it
 */
export class FileManager {
	static async getFileAtUrl(url: string) {
		try {
			const response = await fetch(url);
			if (!response.ok) {
				console.error(`Failed to fetch file at ${url}. Status: ${response.status}`);
				return null;
			}
			return response;
		}
		catch (error) {
			console.error(`An error occurred while fetching the file: ${error}`);
			return null;
		}
	}

	/** Is called for a cool little loading screen when receiving files
	 *
	 * Use it in company of the {@link receiveFile} function
	 */
	static loadingScreen(message: string = "") {
		let op = 0;
		let ang = 0;

		const obj = add([
			layer("cursor"),
			z(gameCursor.z - 1),
			timer(),
		]);

		obj.tween(op, 1, 0.1, (p) => op = p);
		const drawEv = obj.onDraw(() => {
			drawRect({
				width: width(),
				height: height(),
				anchor: "center",
				pos: center(),
				color: BLACK,
				opacity: 0.5 * op,
			});

			drawText({
				text: "LOADING",
				pos: center(),
				color: WHITE,
				anchor: "center",
				opacity: op,
				size: 50,
			});

			drawText({
				text: message,
				pos: vec2(center().x, center().y + 35),
				size: 20,
				opacity: op,
				anchor: "center",
			});

			ang += 1;
			drawSprite({
				sprite: "bean",
				angle: ang,
				anchor: "center",
				pos: vec2(center().x, wave(center().y + 70, center().y + 80, time() + 1)),
				opacity: op,
			});
		});

		return {
			cancel() {
				tween(op, 0, 0.1, (p) => op = p).onEnd(() => {
					drawEv.cancel();
				});
			},
			set message(value: string) {
				message = value;
			},
		};
	}

	/** Convers an image file to a base 64 */
	static ImageToBase64(file: File): string {
		return URL.createObjectURL(file);
	}

	static blobToDataURL(blob: Blob): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = _e => resolve(reader.result as string);
			reader.onerror = _e => reject(reader.error);
			reader.onabort = _e => reject(new Error("Read aborted"));
			reader.readAsDataURL(blob);
		});
	}

	/** Asks for a file from the user
	 * @param type Will either be **mod** to receive a full mod, **audio** to receive only an audio file, or **cover** to only receive an image
	 * @returns The file that the user selected
	 */
	static async receiveFile(type: "mod" | "audio" | "cover"): Promise<File> {
		if (type == "mod") inputElement.accept = ".zip";
		else if (type == "audio") inputElement.accept = ".ogg,.wav,.mp3";
		else if (type == "cover") inputElement.accept = ".png,.jpg,.jpeg";
		inputElement.click();

		return new Promise((resolve) => {
			inputElement.onchange = () => {
				resolve(inputElement.files[0]);
			};
			inputElement.oncancel = () => {
				resolve(null);
			};
		});
	}

	/** Convers a sprite to a data url
	 *
	 * ALREADY INCLUDES `IMAGE_HELPER`
	 */
	static async spriteToDataURL(sprName: string) {
		const canvas = makeCanvas(396, 396);
		canvas.draw(() => {
			drawSprite({
				sprite: sprName,
				width: width(),
				height: height(),
				pos: center(),
				anchor: "center",
			});
		});

		return canvas.toDataURL();
	}

	/** Converts a sound to data url
	 *
	 * USES 'DATA:APLICATION' HELPER BUT STILL WORKS WITH KAPLAY
	 */
	static async soundToDataURL(soundName: string) {
		const audiobuffer = (await getSound(soundName)).buf;

		const blob = audioBufferToBlob(audiobuffer);
		const dataurl = await FileManager.blobToDataURL(blob);
		return dataurl;
	}
}

function audioBufferToBlob(audioBuffer: AudioBuffer) {
	// Returns Uint8Array of WAV bytes
	function getWavBytes(buffer, options) {
		// adapted from https://gist.github.com/also/900023
		// returns Uint8Array of WAV header bytes
		function getWavHeader(options) {
			const numFrames = options.numFrames;
			const numChannels = options.numChannels || 2;
			const sampleRate = options.sampleRate || 44100;
			const bytesPerSample = options.isFloat ? 4 : 2;
			const format = options.isFloat ? 3 : 1;

			const blockAlign = numChannels * bytesPerSample;
			const byteRate = sampleRate * blockAlign;
			const dataSize = numFrames * blockAlign;

			const buffer = new ArrayBuffer(44);
			const dv = new DataView(buffer);

			let p = 0;

			function writeString(s) {
				for (let i = 0; i < s.length; i++) {
					dv.setUint8(p + i, s.charCodeAt(i));
				}
				p += s.length;
			}

			function writeUint32(d) {
				dv.setUint32(p, d, true);
				p += 4;
			}

			function writeUint16(d) {
				dv.setUint16(p, d, true);
				p += 2;
			}

			writeString("RIFF"); // ChunkID
			writeUint32(dataSize + 36); // ChunkSize
			writeString("WAVE"); // Format
			writeString("fmt "); // Subchunk1ID
			writeUint32(16); // Subchunk1Size
			writeUint16(format); // AudioFormat https://i.sstatic.net/BuSmb.png
			writeUint16(numChannels); // NumChannels
			writeUint32(sampleRate); // SampleRate
			writeUint32(byteRate); // ByteRate
			writeUint16(blockAlign); // BlockAlign
			writeUint16(bytesPerSample * 8); // BitsPerSample
			writeString("data"); // Subchunk2ID
			writeUint32(dataSize); // Subchunk2Size

			return new Uint8Array(buffer);
		}

		const type = options.isFloat ? Float32Array : Uint16Array;
		const numFrames = buffer.byteLength / type.BYTES_PER_ELEMENT;

		const headerBytes = getWavHeader(Object.assign({}, options, { numFrames }));
		const wavBytes = new Uint8Array(headerBytes.length + buffer.byteLength);

		// prepend header, then add pcmBytes
		wavBytes.set(headerBytes, 0);
		wavBytes.set(new Uint8Array(buffer), headerBytes.length);

		return wavBytes;
	}

	// Float32Array samples
	const [left, right] = [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)];

	// interleaved
	const interleaved = new Float32Array(left.length + right.length);
	for (let src = 0, dst = 0; src < left.length; src++, dst += 2) {
		interleaved[dst] = left[src];
		interleaved[dst + 1] = right[src];
	}

	// get WAV file bytes and audio params of your audio source
	const wavBytes = getWavBytes(interleaved.buffer, {
		isFloat: true, // floating point or 16-bit integer
		numChannels: 2,
		sampleRate: 48000,
	});
	const wav = new Blob([wavBytes], { type: "audio/wav" });
	return wav;
}
