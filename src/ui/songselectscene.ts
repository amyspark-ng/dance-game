import { GameSave } from "../core/gamesave";
import { songCharts } from "../core/loader"
import { customAudioPlay, playSound } from "../core/plugins/features/sound";
import { goScene, transitionToScene } from "../core/scenes";
import { fadeOut } from "../core/transitions/fadeOutTransition";
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
	const CAPSULE_SIZE = vec2(100)
	
	const bg = add([
		pos(center().x, center().y),
		rect(CAPSULE_SIZE.x, CAPSULE_SIZE.y, { radius: 5 }),
		color(BLACK.lighten(50)),
		anchor("center"),
		opacity(),
		scale(),
		"songCapsule",
		{
			song: song,
			intendedXPos: 0,
		}
	])
	
	const capsuleText = bg.add([
		text(song.title, { align: "center" }),
		pos(),
		anchor("center"),
		opacity(),
	])

	capsuleText.onUpdate(() => {
		capsuleText.pos.y = bg.height / 2 + 15
		capsuleText.opacity = bg.opacity;
	})

	return bg;
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
			songSelectState.songPreview.stop()
			tween(1.25, 1, 0.25, (p) => hoveredCapsule.scale.y = p, easings.easeOutQuad).onEnd(() => {
				const song = hoveredCapsule.song
				transitionToScene(fadeOut, "game", { song: song, dancer: GameSave.preferences.dancer  } as paramsGameScene)
			})
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