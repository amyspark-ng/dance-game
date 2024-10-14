import { Move } from "./dancer"

export type NoteType = {
	timeInSong: number,
	dancerMove: Move,
	index: number,
}

export class Song {
	title: string;
	notes: NoteType[]
}