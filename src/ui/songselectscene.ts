import { GameSave } from "../core/gamesave";
import { loadSong, songCharts } from "../core/loader"
import { cam } from "../core/plugins/features/camera";
import { gameCursor } from "../core/plugins/features/gameCursor";
import { customAudioPlay, playSound } from "../core/plugins/features/sound";
import { goScene, transitionToScene } from "../core/scenes";
import { enterSongTrans } from "../core/transitions/enterSongTransition";
import { fadeOut } from "../core/transitions/fadeOutTransition";
import { fileManager, handleZipInput } from "../fileManaging";
import { rankings, Scoring } from "../play/objects/scoring";
import { paramsGameScene } from "../play/playstate";
import { SaveScore, SongChart } from "../play/song"
import { utils } from "../utils";

/** Gets the saveScore for a song name */
function getHighscore(songName:string) : SaveScore {
	const scoresOfSong = GameSave.songsPlayed.filter((song) => song.idTitle == songName)
	
	if (scoresOfSong.length < 1) {
		return new SaveScore()
	}

	else {
		// get the highest score
		return scoresOfSong.reduce((a, b) => a.tally.score > b.tally.score ? a : b)
	}
}

export class StateSongSelect {
	index: number = 0;

	menuInputEnabled: boolean = true

	songPreview: customAudioPlay;

	/** Scrolls the index, so scrolling the songs */
	scroll(change:number, songAmount: number) {
		this.index = utils.scrollIndex(this.index, change, songAmount)
	};

	updateState() {
		getTreeRoot().trigger("updateState")
	}
}

/** Should add this to album cover, just because  */
const barWidth = 46

/** Adds a song capsule to the song select scene */
export function addSongCapsule(curSong: SongChart) {
	const capsuleContainer = add([
		opacity(),
		pos(center().x, center().y),
		"songCapsule",
		{
			width: 0,
			height: 0,
			song: curSong,
			intendedXPos: 0,
		}
	])
	
	const albumCover = capsuleContainer.add([
		sprite(curSong.idTitle + "-cover"),
		pos(),
		anchor("center"),
		opacity(),
		z(0),
	])
	albumCover.pos.x += (barWidth / 2) - 5
	albumCover.width = 396
	albumCover.height = 396
	capsuleContainer.width = albumCover.width
	capsuleContainer.height = albumCover.height

	const cdCase = capsuleContainer.add([
		sprite("cdCase"),
		pos(),
		color(),
		anchor("center"),
		opacity(),
		scale(),
		z(1),
	])
	
	const capsuleName = capsuleContainer.add([
		text(curSong.title, { align: "center" }),
		pos(),
		anchor("top"),
		opacity(),
	])

	let songDuration = "0"
	getSound(`${curSong.idTitle}-song`).onLoad((data) => {
		songDuration = utils.formatTime(data.buf.duration)
	})

	capsuleContainer.onUpdate(() => {
		let clear = Math.round(Scoring.tally.cleared(getHighscore(curSong.idTitle).tally))
		if (isNaN(clear)) clear = 0
	
		capsuleName.text = `${curSong.title} (${clear}%)\n${songDuration}`
		capsuleName.pos.y = (capsuleContainer.height / 2)
		
		albumCover.opacity = capsuleContainer.opacity;
		cdCase.opacity = capsuleContainer.opacity;
		capsuleName.opacity = capsuleContainer.opacity;
	})

	// if this song isn't played yet don't add the ranking sticker why'd you do that
	if (!(GameSave.songsPlayed.some((song) => song.idTitle == curSong.idTitle))) return
	
	const tally = getHighscore(curSong.idTitle).tally
	const ranking = Scoring.tally.ranking(tally)
	
	const maxOffset = 50
	const offset = vec2(rand(-maxOffset, maxOffset), rand(-maxOffset, maxOffset))
	const randAngle = rand(-20, 20)
	const rankingSticker = capsuleContainer.add([
		sprite("rank_" + ranking),
		pos(),
		rotate(randAngle),
		anchor("center"),
		z(3),
	])

	rankingSticker.pos = offset
	
	return capsuleContainer;
}

type songCapsuleObj = ReturnType<typeof addSongCapsule> 

export type paramsSongSelect =  {
	index?: number,
}

export function SongSelectScene() { scene("songselect", (params: paramsSongSelect) => {
	gameCursor.hide()
	
	setBackground(BLUE.lighten(50))

	params = params ?? { index: 0 }
	const songSelectState = new StateSongSelect()
	songSelectState.index = params.index ?? 0
	songSelectState.songPreview?.stop()

	let songAmount = songCharts.length
	const LERP_AMOUNT = 0.25

	// const allSongs = songCharts.concat(GameSave.importedSongs)
	
	songCharts.forEach((song, index) => {
		addSongCapsule(song)
	})

	let allCapsules = get("songCapsule", { liveUpdate: true }) as songCapsuleObj[]
	onUpdate(() => {
		songAmount = songCharts.length
		allCapsules.forEach((songCapsule, index) => {
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
		text("0", { align: "right" }),
		pos(width(), 0),
		anchor("topright"),
		fixed(),
		{
			value: 0,
			solidValue: 0,
		}
	])

	highscoreText.onUpdate(() => {
		highscoreText.value = Math.floor(lerp(highscoreText.value, highscoreText.solidValue, 0.5))
		highscoreText.text = utils.formatNumber(highscoreText.value, { type: "simple" }) + utils.star
	})

	wait(0.01, () => songSelectState.updateState())

	onKeyPress("left", () => {
		if (!songSelectState.menuInputEnabled) return;
		songSelectState.scroll(-1, songAmount)
		songSelectState.updateState()
	})

	onKeyPress("right", () => {
		if (!songSelectState.menuInputEnabled) return;
		songSelectState.scroll(1, songAmount)
		songSelectState.updateState()
	})
	
	onScroll((delta) => {
		if (!songSelectState.menuInputEnabled) return;
		delta.y = clamp(delta.y, -1, 1)
		songSelectState.scroll(delta.y, songAmount)
		songSelectState.updateState()
	})

	getTreeRoot().on("updateState", () => {
		if (!allCapsules[songSelectState.index]) return

		const tallyScore = getHighscore(allCapsules[songSelectState.index].song.idTitle).tally.score 
		highscoreText.solidValue = Math.floor(tallyScore)

		songSelectState.songPreview?.stop()
		songSelectState.songPreview = playSound(allCapsules[songSelectState.index].song.idTitle + "-song", {
			channel: GameSave.sound.music,
		})
		songSelectState.songPreview.loop = true
		tween(0, GameSave.sound.music.volume, 0.25, (p) => songSelectState.songPreview.volume = p)
	})

	onKeyPress("enter", () => {
		if (!songSelectState.menuInputEnabled) return;
		songSelectState.menuInputEnabled = false
		const hoveredCapsule = allCapsules[songSelectState.index]
		if (hoveredCapsule) {
			songSelectState.songPreview.stop()
			transitionToScene(enterSongTrans, "game", { 
					song: hoveredCapsule.song,
					dancer: GameSave.dancer
				} as paramsGameScene
			)
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
		goScene("menu", { index: 0 })
	})

	onSceneLeave(() => { stopPreview() })

	onKeyPress("q", async () => {
		if (!songSelectState.menuInputEnabled) return
		fileManager.click()
		await handleZipInput(songSelectState)
	})
})}