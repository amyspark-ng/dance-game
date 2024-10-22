import { songCharts } from "../core/loader"
import { transitionToScene } from "../core/scenes";
import { fadeOut } from "../core/transitions/fadeOutTransition";
import { paramsGameScene } from "../play/playstate";
import { SongChart } from "../play/song"

class StateSongSelect {
	index: number = 0;

	/** Scrolls the index, so scrolling the songs */
	scroll(change:number, songAmount: number) {
		// why was this so hard to figure out??
		if (change > 0) {
			if (this.index + change > songAmount - 1) this.index = 0
			else this.index += change
		}

		else if (change < 0) {
			if (this.index - Math.abs(change) < 0) this.index = songAmount - 1
			else this.index -= Math.abs(change)
		}
	}
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
	
	const songAmount = Object.keys(songCharts).length

	const LERP_AMOUNT = 0.25

	Object.values(songCharts).forEach((song, index) => {
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

	onKeyPress("left", () => songSelectState.scroll(-1, songAmount))
	onKeyPress("right", () => songSelectState.scroll(1, songAmount))
	onScroll((delta) => {
		delta.y = clamp(delta.y, -1, 1)
		songSelectState.scroll(delta.y, songAmount)
	})

	onKeyPress("enter", () => {
		const hoveredCapsule = allCapsules[songSelectState.index]
		if (hoveredCapsule) {
			tween(1.25, 1, 0.25, (p) => hoveredCapsule.scale.y = p, easings.easeOutQuad).onEnd(() => {
				
				const song = hoveredCapsule.song
				transitionToScene(fadeOut, "game", { song: song, dancer: "astri"  } as paramsGameScene)
			})
		}
	})
})}