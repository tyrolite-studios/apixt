package crowner

import (
	"sync"
	"time"
)

// ---- Timers ---

type Timer struct {
	name    string
	running uint16
	total   int64
	started int64
	runs    int
	mu      sync.Mutex
}

func (t *Timer) Start() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.running++
	t.runs++
	if t.started == 0 {
		t.started = time.Now().UnixMicro()
	}
	return t.runs
}

func (t *Timer) Stop() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.running == 0 {
		return
	}
	t.running--
	if t.running > 0 {
		return
	}
	t.total += time.Now().UnixMicro() - t.started
	t.started = 0
}

func (t *Timer) End() int64 {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.started > 0 {
		t.total += time.Now().UnixMicro() - t.started
	}
	return t.total
}

type Timers struct {
	timers []*Timer
	mu     sync.Mutex
}

// NewTimers erstellt eine neue Instanz von Timers
func NewTimers() *Timers {
	return &Timers{}
}

func (t *Timers) start(name string) int {
	t.mu.Lock()
	defer t.mu.Unlock()
	for _, timer := range t.timers {
		if timer.name == name {
			return timer.Start()
		}
	}
	timer := &Timer{name: name}
	run := timer.Start()
	t.timers = append(t.timers, timer)
	return run
}

func (t *Timers) stop(name string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	for _, timer := range t.timers {
		if timer.name == name {
			timer.Stop()
			return
		}
	}
}

type timeResult struct {
	name     string
	duration int64
	runs     int
}

func (t *Timers) results() []timeResult {
	t.mu.Lock()
	defer t.mu.Unlock()
	var results []timeResult
	for _, timer := range t.timers {
		results = append(results, timeResult{timer.name, timer.End(), timer.runs})
	}
	return results
}
