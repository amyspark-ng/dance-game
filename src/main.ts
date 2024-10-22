import kaplay, { KAPLAYOpt } from "kaplay"
import "kaplay/global"

import { utils } from "./utils"
import { getCurrent, WebviewWindow } from "@tauri-apps/api/window"
import { sceneNameType } from "./core/scenes"
import { initGame } from "./core/initGame"

// ===== FLAGS =====
export let DEBUG = true
export const PRODUCT_VERSION = "0.0.0"
export const PRODUCT_AUTHOR = "amyspark-ng"
export const PRODUCT_NAME = "dance-game" // lol
export const SAVE_NAME = `${PRODUCT_AUTHOR}.${PRODUCT_NAME}.save`
export const STARTING_SCENE:sceneNameType = "game"

export const DFEATURE_FOCUS = false

// # KAPLAY
export const libraryOpts = {
	width: 1024,
	height: 576,
	canvas: document.querySelector("#kanva"),
	debugKey: "f2",
	debug: DEBUG,
	loadingScreen: true,
	crisp: false,
	backgroundAudio: false,
	stretch: false,
	letterbox: false,
	maxFPS: 90,
} as KAPLAYOpt

// ===== GLOBALS =====
export let appWindow: WebviewWindow  = null
utils.runInDesktop(() => {
	appWindow = getCurrent()
	libraryOpts.stretch = true;
	libraryOpts.letterbox = true
})

const k = kaplay(libraryOpts)

// ===== WHERE THE GAME ACTUALLY STARTS =====
initGame()