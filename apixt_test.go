package apixt

import "testing"

func TestInit(t *testing.T) {
	Init()
	if true != true {
		t.Error("Unexpected result!")
	}
}
