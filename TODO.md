Add events for bpm changes, this can be done with having an array of ChartBPM which would have something like this

```ts
class ChartBPM {
	time: 20.6
	value: 160,
	tweenSpeed: 0,
}
```

And then a song will have an array of that and when time is reached a tween will get triggered which will be linear and will take 'tweenSpeed' seconds, and then do Conductor.changeBPM(p)

TEMPLATE
- Fix volume and gamesave not working
