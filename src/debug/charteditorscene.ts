import { GameState } from "../game/gamestate"
import { Conductor } from "../play/conductor"
import { SongChart } from "../play/song"
import { cam } from "../plugins/features/camera"
import { playSound } from "../plugins/features/sound"
import { utils } from "../utils"

export type chartEditorParams = {
	song: SongChart,
	playbackSpeed: number,
}

export function ChartEditor() { scene("charteditor", (params: chartEditorParams) => {
	// then we actually setup the conductor and play the song
	const audioPlay = playSound(`${params.song.title}-song`, { volume: 0.1, speed: params.playbackSpeed })
	const conductor = new Conductor({ audioPlay: audioPlay, bpm: params.song.bpm * params.playbackSpeed, timeSignature: params.song.timeSignature })
	conductor.setup()

	debug.log("total step: "+ GameState.conductor.totalSteps)
	debug.log("steps per beat: "+ GameState.conductor.stepsPerBeat)
	debug.log("total beats: "+ GameState.conductor.stepsPerBeat)
	debug.log("bpm: "+ GameState.currentSong.bpm)

	onDraw(() => {
		for (let i = 0; i < GameState.conductor.totalSteps; i++) {
			let x = 0;
			let y = i;
	
			const newPos = utils.getPosInGrid(vec2(center().x, 0), i, 0, vec2(50, 50))

			drawRect({
				width: 50,
				height: 50,
				color: i % 2 == 0 ? BLACK.lighten(50) : BLACK.darken(100),
				pos: newPos,
				anchor: "top",
			})
		}
	})
	
	onScroll((delta) => {
		cam.pos.y += delta.y
	})
})}