import { LoadSpriteOpt, SpriteAtlasData } from "kaplay";
import { GameSave } from "../core/save";
import { Move, moveAnimsArr } from "../play/objects/dancer";

export class NoteskinData {
	name: string;
	// spriteData: LoadSpriteOpt;
	static Moves = [...moveAnimsArr, "trail", "tail"] as const;
	constructor(name: string, spriteData?: LoadSpriteOpt) {
		this.name = name;
		// this.spriteData = spriteData;
	}
}

// TODO: Do this like the others
export class NoteskinContent {
	static defaultPaths: string[] = [
		"arrows",
		"taiko",
		"play",
	];

	static loaded: NoteskinContent[] = [];

	static getByName(name: string) {
		return NoteskinContent.loaded.find((skin) => skin.name == name);
	}

	static loadAll() {
		NoteskinContent.defaultPaths.forEach((path) => {
			const atlasData = {} as SpriteAtlasData;
			moveAnimsArr.forEach((move, index) => {
				const y = index % 4 * 80;
				atlasData[`${path}_${move}`] = {
					width: 80,
					height: 80,
					x: 0,
					y,
				};

				atlasData[`${path}_${move}_trail`] = {
					width: 80,
					height: 80,
					x: 80,
					y,
				};

				atlasData[`${path}_${move}_tail`] = {
					width: 80,
					height: 80,
					x: 160,
					y,
				};
			});

			loadSpriteAtlas(`content/noteskins/${path}.png`, atlasData);
			NoteskinContent.loaded.push(new NoteskinContent({ name: path } as NoteskinContent));
		});
	}

	name: string;
	spriteData: LoadSpriteOpt;

	// overloads are very cool
	getSprite(sprite: "tail" | "trail", move: Move): string;
	getSprite(sprite: Move): string;
	getSprite(sprite: typeof NoteskinData.Moves[number], move?: Move) {
		if (sprite == "down" || sprite == "left" || sprite == "right" || sprite == "up") {
			return `${this.name}_${sprite}`;
		}
		else if (sprite == "tail" || sprite == "trail") {
			return `${this.name}_${move}_${sprite}`;
		}
	}

	constructor(instance: NoteskinContent) {
		Object.assign(this, instance);
	}
}

export function getNoteskinSprite(sprite: "tail" | "trail", move: Move): string;
export function getNoteskinSprite(sprite: Move): string;
export function getNoteskinSprite(sprite: typeof NoteskinData.Moves[number], move?: Move) {
	const noteskin = NoteskinContent.getByName(GameSave.noteskin);
	// @ts-ignore
	return noteskin.getSprite(sprite, move);
}
