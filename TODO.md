- Options: Add fullscreen checkbox for desktop
- Options: Add scroll speed multiplier
- Options: Fix weird stuttering on volumes
- Options: Add something to the noteskins to signify which one is currently selected

- Pause: Doesn't say the song that is currently playing (bad)
- Song select: fix weird movement of the covers and cds
- Song select: Weird behaviour of scores lerping
- Song select: Add the clear and song length
- Results: General rehaul, current one sucks

<!-- - Add events for bpm changes, this can be done with having an array of ChartBPM which would have something like this
```ts
class ChartBPM {
	time: 20.6
	value: 160,
	tweenSpeed: 0,
}
```

And then a song will have an array of that and when time is reached a tween will get triggered which will be linear and will take 'tweenSpeed' seconds, and then do Conductor.changeBPM(p) -->