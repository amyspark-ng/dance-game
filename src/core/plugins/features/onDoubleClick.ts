let lastClick:number = 0
let click = 1
let waiter = null

export function onDoubleClick(mouseButton:"left" | "right" = "left", action: () => void, time: number = 0.5, ) {
	return onMousePress(mouseButton, () => {
		click++
		click = click % 2
		
		const now = Date.now()
		if (now - lastClick < time) {
			click = 0
		}

		if (click == 0) {
			waiter = wait(time, () => {
				click = 1
			})
		}

		if (click == 1 && now - lastClick > time) {
			action()
			waiter?.cancel()
			waiter = null
			click = 1
		}

		lastClick = now
	})
}

export function isMouseDoublePressed() {
	return isMousePressed() && click == 1 && waiter == null
}