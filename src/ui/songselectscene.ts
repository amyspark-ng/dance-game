import { GameSave } from "../core/gamesave";
import { songCharts } from "../core/loader"
import { cam } from "../core/plugins/features/camera";
import { customAudioPlay, playSound } from "../core/plugins/features/sound";
import { goScene, transitionToScene } from "../core/scenes";
import { fadeOut } from "../core/transitions/fadeOutTransition";
import { rankings, tallyUtils } from "../play/objects/scoring";
import { paramsGameScene } from "../play/playstate";
import { saveScore, SongChart } from "../play/song"
import { utils } from "../utils";

/** Gets the saveScore for a song name */
function getHighscore(songName:string) {
	const scoresOfSong = GameSave.songsPlayed.filter((song) => song.idTitle == songName)
	if (scoresOfSong.length < 1) return new saveScore()
	else {
		// get the highest score
		return scoresOfSong.reduce((a, b) => a.tally.score > b.tally.score ? a : b)
	}
}

class StateSongSelect {
	index: number = 0;

	menuInputEnabled: boolean = true

	/** Scrolls the index, so scrolling the songs */
	scroll(change:number, songAmount: number) {
		this.index = utils.scrollIndex(this.index, change, songAmount)
	};

	songPreview: customAudioPlay;
}

function addSongCapsule(curSong: SongChart) {
	const albumCover = add([
		sprite(curSong.idTitle + "-cover"),
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
			song: curSong,
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
		text(curSong.title, { align: "center" }),
		pos(),
		anchor("center"),
		opacity(),
	])

	capsuleName.onUpdate(() => {
		capsuleName.pos.x = cdCase.pos.x
		capsuleName.pos.y = cdCase.pos.y + cdCase.height / 2 + 15
		capsuleName.opacity = cdCase.opacity;
	})

	// if this song isn't played yet don't add the ranking sticker why'd you do that
	if (!(GameSave.songsPlayed.some((song) => song.idTitle == curSong.idTitle))) return
	
	const tally = getHighscore(curSong.idTitle).tally
	const ranking = tallyUtils.ranking(tally)
	
	const maxOffset = 50
	const offset = vec2(rand(-maxOffset, maxOffset), rand(-maxOffset, maxOffset))
	const randAngle = rand(-20, 20)
	const rankingSticker = add([
		sprite("rank_" + ranking),
		pos(),
		rotate(randAngle),
		anchor("center"),
	])

	rankingSticker.onUpdate(() => {
		rankingSticker.pos = cdCase.pos.add(offset)
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

	const highscoreText = add([
		text("", { align: "right" }),
		pos(width(), 0),
		anchor("topright"),
		fixed(),
		{
			solidScoreValue: 0,
		}
	])

	highscoreText.onUpdate(() => {
		const lerpedValue = lerp(Number(highscoreText.text), highscoreText.solidScoreValue, 0.5)
		highscoreText.text = Math.round(lerpedValue).toString()
	})

	function updateState() {
		if (!allCapsules[songSelectState.index]) return

		highscoreText.solidScoreValue = getHighscore(allCapsules[songSelectState.index].song.idTitle).tally.score

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

	function stopPreview() {
		songSelectState.songPreview.stop()
	}

	onKeyPress("tab", () => {
		if (!songSelectState.menuInputEnabled) return
		stopPreview()
		goScene("charselect", params)
	})

	onKeyPress("escape", () => {
		if (!songSelectState.menuInputEnabled) return
		stopPreview()
		goScene("options")
	})
})}