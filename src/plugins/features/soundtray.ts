import { GameObj, KEventController, Key, StayComp, TimerController, TweenController } from "kaplay"
import { GameSave } from "../../game/gamesave"
import { playSound } from "./sound"
import { juice } from "../graphics/juiceComponent"

export interface SoundTray {
	show: (keepAround?: boolean) => void,
	hide: () => void,
	onShow?: (action: (changeInVolume: number) => void) => KEventController
	/**
	 * The volume manager object that actually manages most of the sound tray behaviour
	 */
	volumeManager: GameObj<StayComp>,
}

export type addSoundTrayOpt = {
	upVolumeKey: Key,
	downVolumeKey: Key,
	timeForHide: number,
}

/**
 * Adds all the objects related to the sound tray
 */
function addSoundElements() {
	const bg = add([
		rect(width() / 6, 80, { radius: 3 }),
		pos(width() / 2, 0),
		anchor("top"),
		color(BLACK),
		stay(),
		opacity(0.75),
		z(999999999),
		layer("mouse"),
		scale(),
		"volElement",
		"parent",
	])
	
	const volumeText = bg.add([
		text("VOLUME"),
		pos(0, bg.height - 12),
		anchor("center"),
		scale(0.6),
		z(9999999999),
		layer("mouse"),
		"volElement",
		{
			update() {
				if (GameSave.sound.masterVolume > 0) this.text = `VOLUME ${(Math.round(GameSave.sound.masterVolume * 100))}%`
				else this.text = "MUTED"
			}
		}
	])

	// bars
	for (let i = 0; i < 10; i++) {
		bg.add([
			pos(-67 + i * 15, 30),
			rect(10, bg.height - 40, { radius: 1 }),
			opacity(0),
			anchor("center"),
			z(99999999999),
			scale(),
			layer("mouse"),
			juice(),
			timer(),
			"volElement",
			"bar",
			{
				volume: parseFloat((0.1 * (i + 1)).toFixed(1)),
				update() {
					if (GameSave.sound.masterVolume.toFixed(1) < this.volume.toFixed(1)) this.opacity = 0.1
					else this.opacity = 1
				}
			}
		])
	}
}

const getSoundElements = () => get("volElement", { recursive: true })
const fixVolume = () => GameSave.sound.masterVolume = parseFloat(GameSave.sound.masterVolume.toFixed(1))

/**
 * Adds the soundtray, helps you manage the MASTER VOLUME found in {@link GameSave `GameSave`}
 * @param opts 
 * @returns SoundTray object
 */
export function addSoundTray(opts: addSoundTrayOpt) : SoundTray {
	const soundTrayEvents = new KEventHandler()
	let waitingThing = wait(0)

	/** The detune the volume changes */
	let changeVolTune = 0

	// ===================================== 
	//            VOLUME MANAGING 
	// ===================================== 
	const volumeManager = add([
		stay(),
		{
			update() {
				changeVolTune = map(GameSave.sound.masterVolume, 0, 1, -250, 0)
				
				if (isKeyPressed(opts.downVolumeKey)) {
					if (GameSave.sound.masterVolume > 0) {
						GameSave.sound.masterVolume -= 0.1
						fixVolume()
						volume(GameSave.sound.masterVolume)
					}
					soundTrayEvents.trigger("show", -1, false)
				}

				else if (isKeyPressed(opts.upVolumeKey)) {
					if (GameSave.sound.masterVolume <= 0.9) {
						GameSave.sound.masterVolume += 0.1
						fixVolume()
						volume(GameSave.sound.masterVolume)
					}
					soundTrayEvents.trigger("show", 1, false)
				}
			}
		}
	])

	const ANIM_SPEED = 1;
	let animTween:TweenController = null;

	soundTrayEvents.on("hide", () => {
		if (getSoundElements().length === 0) return
		waitingThing.cancel()

		// CUSTOM ANIMATION
		const parent = getSoundElements().filter(e => e.is("parent"))[0]
		
		animTween?.cancel()
		animTween = null

		animTween = tween(parent.pos.y, -parent.height, ANIM_SPEED, (p) => parent.pos.y = p, easings.easeOutQuint)
		animTween.onEnd(() => {
			getSoundElements().forEach((e) => e.destroy())
		})
	})

	soundTrayEvents.on("show", (change:number, keepAround:boolean) => {
		if (getSoundElements().length === 0) {
			addSoundElements()
			const parent = getSoundElements().filter(e => e.is("parent"))[0]
			parent.pos.y = -parent.height
		}

		waitingThing.cancel()

		animTween?.cancel()
		animTween = null

		// CUSTOM ANIMATION
		const parent = getSoundElements().filter(e => e.is("parent"))[0]
		animTween = tween(parent.pos.y, 0, ANIM_SPEED, (p) => parent.pos.y = p, easings.easeOutQuint)

		// this has to be outside of the check
		if (keepAround == false) {
			// user asked for it to be not hidden
			waitingThing = wait(opts.timeForHide, () => {
				soundTrayEvents.trigger("hide")
			})
		}
	})

	return {
		show: (keepAround: boolean = false) => soundTrayEvents.trigger("show", 0, keepAround),
		hide: () => soundTrayEvents.trigger("hide", 0),
		onShow(action) {
			return soundTrayEvents.on("show", action)
		},
		volumeManager: volumeManager,
	}
}

/** The soundtray object, if the {@link setupSoundtray `setupSoundtray`} function was not called it'll be null */
export let soundTray:SoundTray = null

/**
 * Defines the {@link soundTray `soundTray`} starting the soundTray workings
 */
export function setupSoundtray() {
	soundTray = addSoundTray({
		upVolumeKey: "+" as Key,
		downVolumeKey: "-",
		timeForHide: 1.5,
	})

	// # MANAGES GENERAL BEHAVIOUR
	soundTray.onShow((change) => {
		if (change > 0) {
			const bar = getSoundElements().filter((obj) => obj.volume == GameSave.sound.masterVolume)[0]
			
			if (bar) {
				bar.bop({ startScale: 1.2, endScale: 1 })
			}

			if (GameSave.sound.masterVolume == 1) {
				const bars = getSoundElements().filter(obj => obj.is("bar"))
				bars.forEach((bar) => bar.bop({ startScale: 1.2, endScale: 1 }))
			}

			play("plap")
		}

		else if (change < 0) {
			play("plop")
		
			const bar = getSoundElements().filter((obj) => obj.volume == GameSave.sound.masterVolume)[0]
			
			if (bar) {
				bar.bop({ startScale: 0.9, endScale: 1 })
			}
		}

		// CHANGE WAS 0, called through show() function
		else {

		}
	})
}