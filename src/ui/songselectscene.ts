import { GameSave } from "../core/gamesave";
import { songCharts } from "../core/loader"
import { cam } from "../core/plugins/features/camera";
import { customAudioPlay, playSound } from "../core/plugins/features/sound";
import { goScene, transitionToScene } from "../core/scenes";
import { fadeOut } from "../core/transitions/fadeOutTransition";
import { rankings } from "../play/objects/scoring";
import { paramsGameScene } from "../play/playstate";
import { SongChart } from "../play/song"
import { utils } from "../utils";

class StateSongSelect {
	index: number = 0;

	menuInputEnabled: boolean = true

	/** Scrolls the index, so scrolling the songs */
	scroll(change:number, songAmount: number) {
		this.index = utils.scrollIndex(this.index, change, songAmount)
	};

	songPreview: customAudioPlay;
}

function addSongCapsule(song: SongChart) {
	const albumCover = add([
		sprite(song.idTitle + "-cover"),
		pos(center().x, center().y),
		anchor("center"),
	])
	
	const cdCase = add([
		sprite("cdCase"),
		pos(center().x, center().y),
		color(),
		anchor("center"),
		opacity(0.5),
		scale(),
		"songCapsule",
		{
			song: song,
			intendedXPos: 0,
		}
	])

	const barWidth = 46
	albumCover.onUpdate(() => {
		albumCover.pos.x = cdCase.pos.x + barWidth / 2
		albumCover.pos.y = cdCase.pos.y
	})

	albumCover.width = 396
	albumCover.height = 396

	const capsuleName = add([
		text(song.title, { align: "center" }),
		pos(),
		anchor("center"),
		opacity(),
	])

	capsuleName.onUpdate(() => {
		capsuleName.pos.x = cdCase.pos.x
		capsuleName.pos.y = cdCase.pos.y + cdCase.height / 2 + 15
		capsuleName.opacity = cdCase.opacity;
	})

	return cdCase;
}

type songCapsuleObj = ReturnType<typeof addSongCapsule> 

export type paramsSongSelect =  {
	index?: number,
}

export function SongSelectScene() { scene("songselect", (params: paramsSongSelect) => {
	setBackground(BLUE.lighten(50))

	params = params ?? { index: 0 }
	const songSelectState = new StateSongSelect()
	songSelectState.index = params.index ?? 0
	songSelectState.songPreview?.stop()

	const songAmount = songCharts.length
	const LERP_AMOUNT = 0.25

	songCharts.forEach((song, index) => {
		addSongCapsule(song)
	})

	const allCapsules = get("songCapsule") as songCapsuleObj[]
	allCapsules.forEach((songCapsule, index) => {
		songCapsule.onUpdate(() => {
			let opacity = 1
			
			const indexOfCapsule = allCapsules.indexOf(songCapsule)
			
			if (indexOfCapsule == songSelectState.index) {
				opacity = 1
				songCapsule.intendedXPos = center().x
			}

			else {
				opacity = 0.5
				songCapsule.intendedXPos = center().x + songCapsule.width * 1.5 * (index - songSelectState.index)
			}

			songCapsule.opacity = lerp(songCapsule.opacity, opacity, LERP_AMOUNT)
			songCapsule.pos.x = lerp(songCapsule.pos.x, songCapsule.intendedXPos, LERP_AMOUNT)
		})
	})

	function updateState() {
		if (!allCapsules[songSelectState.index]) return

		songSelectState.songPreview?.windDown()
		songSelectState.songPreview = playSound(allCapsules[songSelectState.index].song.idTitle + "-song", {
			volume: 0.1,
		})
		songSelectState.songPreview.loop = true
	}

	wait(0.01, () => updateState())

	onKeyPress("left", () => {
		if (!songSelectState.menuInputEnabled) return;
		songSelectState.scroll(-1, songAmount)
		updateState()
	})

	onKeyPress("right", () => {
		if (!songSelectState.menuInputEnabled) return;
		songSelectState.scroll(1, songAmount)
		updateState()
	})
	
	onScroll((delta) => {
		if (!songSelectState.menuInputEnabled) return;
		delta.y = clamp(delta.y, -1, 1)
		songSelectState.scroll(delta.y, songAmount)
		updateState()
	})

	onKeyPress("enter", () => {
		if (!songSelectState.menuInputEnabled) return;
		songSelectState.menuInputEnabled = false
		const hoveredCapsule = allCapsules[songSelectState.index]
		if (hoveredCapsule) {
			let fadeout = add([
				rect(width() * 5, height() * 5),
				pos(center()),
				anchor("center"),
				opacity(0),
			])
			
			songSelectState.songPreview.stop()
			tween(cam.zoom, vec2(5), 1, (p) => cam.zoom = p, easings.easeInBack).onEnd(() => {
				camFlash(WHITE, 0.25)
				cam.zoom = vec2(1)
				goScene("game", { song: hoveredCapsule.song, dancer: GameSave.preferences.dancer } as paramsGameScene)
			})

			tween(fadeout.opacity, 1, 0.75, (p) => fadeout.opacity = p)
		}
	})

	onKeyPress("tab", () => {
		songSelectState.songPreview.stop()
		goScene("charselect", params)
	})

	onKeyPress("escape", () => {
		songSelectState.songPreview.stop()
		goScene("options")
	})
})}