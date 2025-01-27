import { gameCursor } from "./core/cursor";

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
	static loadingScreen() {
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
		};
	}

	/** Convers an image file to a base 64 */
	static ImageToBase64(file: File): string {
		return URL.createObjectURL(file);
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

	/** Convers a sprite to a data url */
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

		const dataURL = canvas.toDataURL();
		return dataURL;
	}
}
